// @flow
/* global requestAnimationFrame */
import React, { Component } from "react";
import PropTypes from "prop-types";
import autobind from "class-autobind";
import ReactNative, {
  View,
  Animated,
  PanResponder,
  Easing
} from "react-native";
import FlexImage from "./FlexImage";

import getDistance from "./helpers/getDistance";
import getScale from "./helpers/getScale";
import measureNode from "./helpers/measureNode";

import type { Measurement } from "./types/Measurement";
import type { Touch } from "./types/Touch";

type Event = {
  nativeEvent: {
    touches: Array<Touch>
  }
};

type GestureState = {
  stateID: string,
  dx: number,
  dy: number
};

type Props = {
  source: { uri: string },
  isDragging: boolean,
  onGestureStart: ({ photoURI: string, measurement: Measurement }) => void,
  onGestureRelease: () => void,
  hideDuration?: number,
  renderCaption?: React.ComponentType<*>
};

type Context = {
  gesturePosition: Animated.ValueXY,
  scaleValue: Animated.Value,
  getScrollPosition: () => number
};

export default class PhotoComponent extends Component {
  props: Props;
  context: Context;
  _parent: ?Object;
  _photoComponent: ?Object;
  _gestureHandler: Object;
  _initialTouches: Array<Object>;
  _selectedPhotoMeasurement: Measurement;
  _gestureInProgress: ?string;

  _opacity: Animated.Value;

  static contextTypes = {
    gesturePosition: PropTypes.object,
    scaleValue: PropTypes.object,
    getScrollPosition: PropTypes.func
  };

  static defaultProps = {
    hideDuration: 250
  };

  constructor() {
    super(...arguments);
    autobind(this);

    this._generatePanHandlers();
    this._initialTouches = [];
    this._opacity = new Animated.Value(1);
    this.state = {
      zoomOut: true
    };
  }

  render() {
    let { source, renderCaption } = this.props;

    return (
      <View ref={parentNode => (this._parent = parentNode)}>
        {renderCaption && renderCaption()}
        <Animated.View
          ref={node => (this._photoComponent = node)}
          {...this._gestureHandler.panHandlers}
          style={{ opacity: this._opacity }}
        >
          <FlexImage source={source} />
        </Animated.View>
      </View>
    );
  }

  _generatePanHandlers() {
    this._gestureHandler = PanResponder.create({
      onStartShouldSetResponderCapture: () => true,
      onStartShouldSetPanResponderCapture: (event: Event) => {
        return event.nativeEvent.touches.length === 2;
      },
      onMoveShouldSetResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: (event: Event) => {
        return event.nativeEvent.touches.length === 2;
      },
      onPanResponderGrant: this._startGesture,
      onPanResponderMove: this._onGestureMove,
      onPanResponderRelease: this._onGestureRelease,
      onPanResponderTerminationRequest: () => {
        return this._gestureInProgress == null;
      },
      onPanResponderTerminate: (event, gestureState) => {
        return this._onGestureRelease(event, gestureState);
      }
    });
  }

  async _startGesture(event: Event, gestureState: GestureState) {
    // Sometimes gesture start happens two or more times rapidly.
    if (this._gestureInProgress) {
      return;
    }

    this._gestureInProgress = gestureState.stateID;
    let { source, onGestureStart } = this.props;
    let { gesturePosition, getScrollPosition } = this.context;
    let { touches } = event.nativeEvent;

    this._initialTouches = touches;

    let selectedPhotoMeasurement = await this._measureSelectedPhoto();
    this._selectedPhotoMeasurement = selectedPhotoMeasurement;
    onGestureStart({
      photoURI: source.uri,
      measurement: selectedPhotoMeasurement
    });

    gesturePosition.setValue({
      x: 0,
      y: 0
    });

    gesturePosition.setOffset({
      x: 0,
      y: selectedPhotoMeasurement.y - getScrollPosition()
    });

    Animated.timing(this._opacity, {
      toValue: 0,
      duration: 200
    }).start();
  }

  _onGestureMove(event: Event, gestureState: GestureState) {
    let { touches } = event.nativeEvent;
    if (!this._gestureInProgress) {
      return;
    }
    if (touches.length < 2) {
      // Trigger a realease
      this._onGestureRelease(event, gestureState);
      return;
    }

    // for moving photo around
    let { gesturePosition, scaleValue } = this.context;
    let { dx, dy } = gestureState;
    gesturePosition.x.setValue(dx);
    gesturePosition.y.setValue(dy);

    // for scaling photo
    let currentDistance = getDistance(touches);
    let initialDistance = getDistance(this._initialTouches);
    let newScale = getScale(currentDistance, initialDistance);
    scaleValue.setValue(newScale);
  }

  _onGestureRelease(event, gestureState: GestureState) {
    if (this._gestureInProgress !== gestureState.stateID) {
      return;
    }

    this._gestureInProgress = null;
    this._initialTouches = [];
    let { onGestureRelease } = this.props;
    let { gesturePosition, scaleValue, getScrollPosition } = this.context;

    // set to initial position and scale
    Animated.parallel([
      Animated.timing(gesturePosition.x, {
        toValue: 0,
        duration: this.props.hideDuration,
        easing: Easing.ease,
        useNativeDriver: true
      }),
      Animated.timing(gesturePosition.y, {
        toValue: 0,
        duration: this.props.hideDuration,
        easing: Easing.ease,
        useNativeDriver: true
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: this.props.hideDuration,
        easing: Easing.ease,
        useNativeDriver: true
      })
    ]).start(() => {
      gesturePosition.setOffset({
        x: 0,
        y:
          (this._selectedPhotoMeasurement &&
            this._selectedPhotoMeasurement.y) ||
          0 - getScrollPosition()
      });

      this._opacity.setValue(1);

      requestAnimationFrame(() => {
        onGestureRelease();
      });
    });
  }

  async _measureSelectedPhoto() {
    let parent = ReactNative.findNodeHandle(this._parent);
    let photoComponent = ReactNative.findNodeHandle(this._photoComponent);

    let [parentMeasurement, photoMeasurement] = await Promise.all([
      measureNode(parent),
      measureNode(photoComponent)
    ]);

    return {
      x: photoMeasurement.x,
      y: parentMeasurement.y + photoMeasurement.y,
      w: photoMeasurement.w,
      h: photoMeasurement.h
    };
  }
}
