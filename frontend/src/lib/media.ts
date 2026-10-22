import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import type { Photo, GeoPoint } from "../types";

export async function choosePhoto(camera = false): Promise<Photo | null> {
  if (camera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        "Permite el acceso a la cámara o selecciona una imagen de tus archivos.",
      );
  }
  const result = camera
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: false,
      });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const resize =
    asset.width > 1400 || asset.height > 1400
      ? [
          {
            resize:
              asset.width >= asset.height ? { width: 1400 } : { height: 1400 },
          },
        ]
      : [];
  const image = await ImageManipulator.manipulateAsync(asset.uri, resize, {
    compress: 0.68,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!image.base64)
    throw new Error(
      "No se pudo procesar la fotografía. Intenta con un archivo JPG o PNG.",
    );
  if (image.base64.length > Math.ceil((2 * 1024 * 1024 * 4) / 3))
    throw new Error(
      "La imagen supera 2 MiB. Selecciona una imagen más pequeña.",
    );
  return {
    imageData: `data:image/jpeg;base64,${image.base64}`,
    source: camera ? "camera" : "upload",
  };
}
export const DEMO_LOCATION: GeoPoint = {
  latitude: -12.0464,
  longitude: -77.0428,
  locationSource: "demo",
};
export async function getCurrentLocation(): Promise<GeoPoint> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "La ubicación fue denegada. Puedes continuar sin coordenadas o usar la ubicación de prueba.",
    );
  const location = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "No se obtuvo la ubicación en 12 segundos. Puedes continuar sin coordenadas o usar la ubicación de prueba.",
            ),
          ),
        12000,
      ),
    ),
  ]);
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    locationSource: "device",
  };
}
