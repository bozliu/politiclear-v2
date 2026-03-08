import { Linking } from "react-native";

export async function openExternalUrl(url, options = {}) {
  const { onError, onSuccess, sourceLabel } = options;

  try {
    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      throw new Error(`Unsupported external URL: ${url}`);
    }

    await Linking.openURL(url);

    if (onSuccess) {
      onSuccess({
        sourceLabel: sourceLabel || null,
        url,
      });
    }

    return true;
  } catch (error) {
    if (onError) {
      onError({
        error,
        sourceLabel: sourceLabel || null,
        url,
      });
    }

    return false;
  }
}
