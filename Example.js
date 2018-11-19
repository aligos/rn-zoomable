// @flow
import React from "react";
import PropTypes from "prop-types";
import {
  StyleSheet,
  View,
  ScrollView,
  Animated,
  StatusBar
} from "react-native";
import { ListItem } from "react-native-elements";
import { ZoomableImage, SelectedImage } from "rn-zoomable";

import type { Measurement } from "rn-zoomable/types/Measurement";

let photos = [
  {
    uri:
      "https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F27714985%2F33790035043%2F1%2Foriginal.jpg?w=1000&rect=295%2C0%2C3214%2C1607&s=fb087ad58b8596660f243dc4523acbca"
  },
  {
    uri:
      "https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F33376779%2F119397753453%2F1%2Foriginal.jpg?w=1000&rect=0%2C57%2C7220%2C3610&s=c439fda7b39fc1d98a23f5cf1b4dfd8e"
  },
  {
    uri:
      "https://mm.creativelive.com/fit/https%3A%2F%2Fagc.creativelive.com%2Fagc%2Fcourses%2F5222-1.jpg/1200"
  },
  {
    uri:
      "https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F31079558%2F50958620730%2F1%2Foriginal.jpg?w=1000&rect=148%2C418%2C2360%2C1180&s=2f48e3d424143273cb5f98a7342bd1ee"
  },
  {
    uri:
      "https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F32179220%2F214666330784%2F1%2Foriginal.jpg?w=1000&rect=357%2C293%2C2326%2C1163&s=6ccee5095fbfd4a7b9aead2c2d355e3d"
  }
];

type SelectedImageType = { photoURI: string, measurement: Measurement };

type State = {
  selectedImage?: SelectedImageType,
  isDragging: boolean
};

export default class App extends React.Component {
  state: State;
  _scrollValue: Animated.Value;
  _scaleValue: Animated.Value;
  _gesturePosition: Animated.ValueXY;

  constructor() {
    super(...arguments);

    this._scrollValue = new Animated.Value(0);
    this._scaleValue = new Animated.Value(1);
    this._gesturePosition = new Animated.ValueXY();
    this.state = {
      isDragging: false
    };
  }

  static childContextTypes = {
    gesturePosition: PropTypes.object,
    getScrollPosition: PropTypes.func,
    scaleValue: PropTypes.object
  };

  getChildContext() {
    return {
      gesturePosition: this._gesturePosition,
      scaleValue: this._scaleValue,
      getScrollPosition: () => {
        return this._scrollValue.__getValue();
      }
    };
  }

  render() {
    let { isDragging, selectedImage } = this.state;
    let onScroll = Animated.event([
      { nativeEvent: { contentOffset: { y: this._scrollValue } } }
    ]);

    return (
      <View style={styles.container}>
        <StatusBar hidden={isDragging} />
        <ScrollView
          scrollEventThrottle={16}
          onScroll={onScroll}
          scrollEnabled={!isDragging}
        >
          {photos.map((photo, key) => {
            return (
              <ZoomableImage
                source={photo}
                key={key}
                isDragging={isDragging}
                onGestureStart={(selectedImage: SelectedImageType) => {
                  this.setState({ selectedImage, isDragging: true });
                }}
                onGestureRelease={() =>
                  this.setState({
                    isDragging: false
                  })
                }
                renderCaption={() => (
                  <ListItem
                    leftAvatar={{
                      source: {
                        uri:
                          "https://s3.amazonaws.com/uifaces/faces/twitter/ladylexy/128.jpg"
                      }
                    }}
                    title="Wooo"
                  />
                )}
              />
            );
          })}
        </ScrollView>
        {isDragging ? (
          <SelectedImage
            key={selectedImage ? selectedImage.photoURI : ""}
            selectedImage={selectedImage}
          />
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
