import { useState, useEffect, useRef } from "react";
import { Dimensions, Image, Platform } from "react-native";
import { Asset } from "expo-asset";

/**
 * used to get scaled background position relative to the screen size.
 * @param image imported image object
 * @returns scaledImageDimensions
 */
const useDimensions = (image) => {
  const screenDimensions = useRef(Dimensions.get("screen"));
  const windowDimensions = useRef(Dimensions.get("window"));
  // Dont use screen dimensions if on web.
  if (Platform.OS === 'web') {
    screenDimensions.current = Dimensions.get("window");
  }

  const [scaledImageDimensions, setScaledImageDimensions] = useState({
    width: 0,
    height: 0,
    xZero: 0,
    yZero: 0,
  });

  useEffect(() => {
    // Checks if screen dimensions got flipped. (bug?)
    if (
      checkForVerticalScreenBug(
        screenDimensions.current,
        windowDimensions.current
      )
    ) {
      screenDimensions.current = {
        height: screenDimensions.current.width,
        width: screenDimensions.current.height,
      };
    }
    // Add an event listner for when window or screen dimensions change.
    const handleChange = ({ screen, window }) => {
      // console.log("[DEBUG] Window or screen dimensions changed.", window, screen);
    };
    const subscription = Dimensions.addEventListener("change", handleChange);
    return () => {
      if (subscription) {
        subscription.remove();
      } else {
        try {
          Dimensions.removeEventListener("change", handleChange);
        } catch (err) {}
      }
    };
  }, []);

  useEffect(() => {
    // Get get image size using Image.getSize
    const imageURI = Asset.fromModule(image).uri;
    Image.getSize(
      imageURI,
      (width, height) => {
        const IMG_RATIO = width / height;
        const SCREEN_RATIO =
          screenDimensions.current.width / screenDimensions.current.height;
        if (IMG_RATIO < SCREEN_RATIO) {
          // Compare image and screen ratio to determine which one is wider
          // If creen is wider than image
          let ratio_constant = screenDimensions.current.width / width; // used to scale image to right size.
          setScaledImageDimensions({
            width: width * ratio_constant,
            height: height * ratio_constant,
            xZero: 0,
            yZero:
              (height * ratio_constant - screenDimensions.current.height) / 2, // amount of image on top that is cropped.
          });
        } else {
          // If image is wider than screen
          let ratio_constant = screenDimensions.current.height / height; // used to scale image to right size.
          setScaledImageDimensions({
            width: width * ratio_constant,
            height: height * ratio_constant,
            xZero:
              (width * ratio_constant - screenDimensions.current.width) / 2, // amount of image on left that is cropped.
            yZero: 0,
          });
        }
      },
      (err) => {
        console.error(err);
      }
    );
  }, [windowDimensions.current, image]);

  /**
   * Used to fix bug that I noticed when using some emulators.
   * The bug makes the background image oversized because it reads screen widht and height
   * as if the phone was being used vertically rather than horizontally.
   * Aka width and height is flipped. Dimension.window seems to work better.
   * @param screen contains width and height of screen
   * @param window contains width and height of window
   * @returns whether the screen dimensions have been flipped or not?
   */
  const checkForVerticalScreenBug = (screen, window) => {
    const DIFFERENCE_TOLLERANCE = 0.2;
    const REVERSE_WINDOW_RATIO = window.height / window.width;
    let screen_ratio = screen.width / screen.height;
    // Means that screen width and height have been flipped. This was a bug on the emulator.
    if (Math.abs(REVERSE_WINDOW_RATIO - screen_ratio) < DIFFERENCE_TOLLERANCE) {
      return true;
    } else return false;
  };

  return { scaledImageDimensions, screenDimensions };
};

export default useDimensions;