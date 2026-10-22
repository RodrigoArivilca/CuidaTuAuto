import React, { useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Api } from "../lib/api";
import { errorMessage } from "../lib/format";
import { choosePhoto, DEMO_LOCATION, getCurrentLocation } from "../lib/media";
import type { Custody, GeoPoint, Photo, Vehicle } from "../types";
import {
  Button,
  C,
  Chip,
  Divider,
  Field,
  Icon,
  Notice,
  Sheet,
  s,
} from "../components/ui";

export function VehicleSheet({
  api,
  vehicle,
  onClose,
  onSaved,
}: {
  api: Api;
  vehicle?: Vehicle | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [plate, setPlate] = useState(vehicle?.plate || "");
  const [brand, setBrand] = useState(vehicle?.brand || "");
  const [model, setModel] = useState(vehicle?.model || "");
  const [color, setColor] = useState(vehicle?.color || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function save(remove = false) {
    setError("");
    if (!remove && [plate, brand, model, color].some((v) => !v.trim())) {
      setError("Completa la placa, marca, modelo y color.");
      return;
    }
    setBusy(true);
    try {
      if (remove && vehicle) await api.delete(`/vehicles/${vehicle.id}`);
      else if (vehicle)
        await api.patch(`/vehicles/${vehicle.id}`, {
          plate: plate.trim(),
          brand: brand.trim(),
          model: model.trim(),
          color: color.trim(),
        });
      else
        await api.post("/vehicles", {
          plate: plate.trim(),
          brand: brand.trim(),
          model: model.trim(),
          color: color.trim(),
        });
      await onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={vehicle ? "Editar vehículo" : "Agregar vehículo"}
      subtitle="Estos datos identificarán al vehículo en tus custodias."
      onClose={busy ? () => {} : onClose}
    >
      {!!error && <Notice kind="error" text={error} />}
      <Field
        label="Placa"
        placeholder="ABC-123"
        value={plate}
        onChangeText={(v) => setPlate(v.toUpperCase())}
        autoCapitalize="characters"
        maxLength={12}
        testID="vehicle-plate"
      />
      <Field
        label="Marca"
        placeholder="Toyota"
        value={brand}
        onChangeText={setBrand}
        maxLength={60}
        testID="vehicle-brand"
      />
      <Field
        label="Modelo"
        placeholder="Corolla"
        value={model}
        onChangeText={setModel}
        maxLength={60}
        testID="vehicle-model"
      />
      <Field
        label="Color"
        placeholder="Gris"
        value={color}
        onChangeText={setColor}
        maxLength={40}
        testID="vehicle-color"
      />
      <Button
        onPress={() => save()}
        busy={busy}
        icon="checkmark"
        testID="vehicle-save"
      >
        Guardar vehículo
      </Button>
      {vehicle && (
        <>
          <Divider />
          <Text style={s.hint}>
            Los vehículos con custodias se conservan para mantener su historial.
          </Text>
          {confirmDelete ? (
            <>
              <Notice
                text={`¿Eliminar ${vehicle.plate}? Esta acción elimina el registro del vehículo si no tiene custodias.`}
              />
              <View style={s.wrap}>
                <Button
                  variant="secondary"
                  onPress={() => setConfirmDelete(false)}
                >
                  Conservar
                </Button>
                <Button
                  variant="danger"
                  busy={busy}
                  onPress={() => save(true)}
                  testID="vehicle-delete-confirm"
                >
                  Confirmar eliminación
                </Button>
              </View>
            </>
          ) : (
            <Button
              variant="ghost"
              icon="trash-outline"
              onPress={() => setConfirmDelete(true)}
              testID="vehicle-delete"
            >
              Eliminar vehículo
            </Button>
          )}
        </>
      )}
    </Sheet>
  );
}

export function LocationPicker({
  value,
  onChange,
  demoMode,
}: {
  value: GeoPoint;
  onChange: (point: GeoPoint) => void;
  demoMode: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function locate() {
    setBusy(true);
    setError("");
    try {
      onChange(await getCurrentLocation());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.fieldLabel}>Ubicación de este registro</Text>
      <View style={s.wrap}>
        <Button
          variant="secondary"
          onPress={locate}
          busy={busy}
          icon="locate-outline"
        >
          Usar mi ubicación
        </Button>
        {demoMode && (
          <Button
            variant="ghost"
            onPress={() => {
              onChange(DEMO_LOCATION);
              setError("");
            }}
            icon="flask-outline"
            testID="location-demo"
          >
            Ubicación de prueba
          </Button>
        )}
      </View>
      {value.latitude !== null && value.longitude !== null ? (
        <View style={{ gap: 7 }}>
          <Text style={s.hint}>
            {value.locationSource === "demo"
              ? "Coordenadas de prueba"
              : "Ubicación del dispositivo"}{" "}
            · {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
          </Text>
          <Button
            variant="ghost"
            onPress={() =>
              onChange({
                latitude: null,
                longitude: null,
                locationSource: "manual",
              })
            }
            style={{ alignSelf: "flex-start", minHeight: 30, padding: 0 }}
          >
            Continuar sin coordenadas
          </Button>
        </View>
      ) : (
        <Text style={s.hint}>
          Las coordenadas son opcionales. Solo se consulta la ubicación cuando
          lo solicitas.
        </Text>
      )}
      {!!error && <Notice kind="error" text={error} />}
    </View>
  );
}

export function NewCustodySheet({
  api,
  vehicles,
  demoMode,
  onClose,
  onCreated,
}: {
  api: Api;
  vehicles: Vehicle[];
  demoMode: boolean;
  onClose: () => void;
  onCreated: (custody: Custody) => Promise<void>;
}) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || "");
  const [locationLabel, setLocationLabel] = useState("");
  const [interval, setInterval] = useState(20);
  const [point, setPoint] = useState<GeoPoint>({
    latitude: null,
    longitude: null,
    locationSource: "manual",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!vehicleId || !locationLabel.trim()) {
      setError("Selecciona un vehículo y escribe el lugar de custodia.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { custody } = await api.post<{ custody: Custody }>("/custodies", {
        vehicleId,
        locationLabel: locationLabel.trim(),
        roundIntervalMinutes: interval,
        ...point,
      });
      await onCreated(custody);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title="Iniciar una custodia"
      subtitle="Primero registra la entrega. Después podrás vincular al cuidador."
      onClose={busy ? () => {} : onClose}
    >
      {!!error && <Notice kind="error" text={error} />}
      <Text style={s.fieldLabel}>¿Qué vehículo vas a dejar?</Text>
      <View style={s.wrap}>
        {vehicles.map((v) => (
          <Chip
            key={v.id}
            label={`${v.plate} · ${v.brand}`}
            icon="car-outline"
            selected={vehicleId === v.id}
            onPress={() => setVehicleId(v.id)}
          />
        ))}
      </View>
      {!vehicles.length && (
        <Notice text="Registra primero un vehículo desde la sección Mis vehículos." />
      )}
      <Field
        label="Lugar de custodia"
        placeholder="Ej. Av. Arequipa, frente al parque"
        value={locationLabel}
        onChangeText={setLocationLabel}
        maxLength={160}
        testID="custody-location"
      />
      <View style={{ gap: 10 }}>
        <Text style={s.fieldLabel}>Intervalo de rondas</Text>
        <View style={s.wrap}>
          {[10, 20, 30, 60].map((v) => (
            <Chip
              key={v}
              label={`${v} min`}
              selected={interval === v}
              onPress={() => setInterval(v)}
            />
          ))}
        </View>
        <Text style={s.hint}>
          El cuidador verá esta frecuencia acordada para registrar sus rondas.
        </Text>
      </View>
      <LocationPicker value={point} onChange={setPoint} demoMode={demoMode} />
      <Button
        onPress={submit}
        busy={busy}
        disabled={!vehicles.length}
        icon="arrow-forward"
        testID="custody-create-submit"
      >
        Crear custodia y agregar evidencias
      </Button>
    </Sheet>
  );
}

function Scanner({
  onCode,
  onCancel,
}: {
  onCode: (code: string) => void;
  onCancel: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const read = useRef(false);
  const [cameraError, setCameraError] = useState("");
  async function permit() {
    try {
      const result = await requestPermission();
      if (!result.granted)
        setCameraError(
          "No se concedió acceso a la cámara. Puedes ingresar el código manualmente.",
        );
    } catch {
      setCameraError(
        "La cámara no está disponible. Ingresa el código manualmente.",
      );
    }
  }
  if (!permission?.granted)
    return (
      <View style={{ gap: 14 }}>
        <Notice
          text={
            cameraError ||
            "Permite la cámara para leer el código. También puedes ingresarlo manualmente."
          }
          kind={cameraError ? "error" : "info"}
        />
        <Button
          onPress={() => {
            void permit();
          }}
          icon="camera-outline"
        >
          Permitir cámara
        </Button>
        <Button variant="ghost" onPress={onCancel}>
          Usar código manual
        </Button>
      </View>
    );
  return (
    <View style={{ gap: 13 }}>
      {cameraError ? (
        <Notice text={cameraError} kind="error" />
      ) : (
        <CameraView
          style={{ height: 300, borderRadius: 14 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onMountError={() =>
            setCameraError(
              "No se pudo iniciar la cámara. Utiliza el código manual para continuar.",
            )
          }
          onBarcodeScanned={({ data }) => {
            if (!read.current) {
              read.current = true;
              onCode(data);
            }
          }}
        />
      )}
      <Text style={[s.hint, { textAlign: "center" }]}>
        Coloca el QR del propietario dentro de la cámara.
      </Text>
      <Button variant="secondary" onPress={onCancel}>
        Cerrar cámara
      </Button>
    </View>
  );
}
export function AcceptSheet({
  api,
  onClose,
  onAccepted,
}: {
  api: Api;
  onClose: () => void;
  onAccepted: (custody: Custody) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!code.trim()) {
      setError("Ingresa o escanea el código de custodia.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { custody } = await api.post<{ custody: Custody }>(
        "/custodies/accept",
        { code: code.trim() },
      );
      await onAccepted(custody);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title="Vincular una custodia"
      subtitle="Solicita el código al propietario del vehículo."
      onClose={busy ? () => {} : onClose}
    >
      {!!error && <Notice kind="error" text={error} />}
      {scan ? (
        <Scanner
          onCode={(value) => {
            setCode(value);
            setScan(false);
          }}
          onCancel={() => setScan(false)}
        />
      ) : (
        <>
          <View
            style={{
              alignItems: "center",
              backgroundColor: C.tealLight,
              borderRadius: 16,
              padding: 25,
              gap: 12,
            }}
          >
            <Icon name="qr-code-outline" size={68} color={C.teal} />
            <Button
              onPress={() => setScan(true)}
              variant="secondary"
              icon="camera-outline"
              testID="qr-scan-open"
            >
              Escanear QR
            </Button>
          </View>
          <Field
            label="Código de custodia"
            value={code}
            onChangeText={setCode}
            placeholder="Ingresa el código del propietario"
            autoCapitalize="characters"
            autoCorrect={false}
            testID="accept-code"
          />
          <Text style={s.hint}>
            El propietario debe registrar las cuatro evidencias iniciales antes
            de vincularte.
          </Text>
          <Button
            onPress={submit}
            busy={busy}
            icon="shield-checkmark-outline"
            testID="accept-submit"
          >
            Aceptar custodia
          </Button>
        </>
      )}
    </Sheet>
  );
}

export function RoundSheet({
  api,
  custody,
  demoMode,
  onClose,
  onSaved,
}: {
  api: Api;
  custody: Custody;
  demoMode: boolean;
  onClose: () => void;
  onSaved: (custody: Custody) => void;
}) {
  const [status, setStatus] = useState<"ok" | "incident">("ok");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [demo, setDemo] = useState(false);
  const [point, setPoint] = useState<GeoPoint>({
    latitude: null,
    longitude: null,
    locationSource: "manual",
  });
  const [busy, setBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [error, setError] = useState("");
  async function pick(camera: boolean) {
    setMediaBusy(true);
    setError("");
    try {
      const result = await choosePhoto(camera);
      if (result) {
        setPhoto(result);
        setDemo(false);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setMediaBusy(false);
    }
  }
  async function submit() {
    if (!photo && !demo) {
      setError("Adjunta una fotografía de la ronda.");
      return;
    }
    if (status === "incident" && !note.trim()) {
      setError("Describe la incidencia para informar al propietario.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { custody: updated } = await api.post<{ custody: Custody }>(
        `/custodies/${custody.id}/rounds`,
        {
          status,
          note: note.trim(),
          ...point,
          ...(demo ? { useDemoImage: true } : photo),
        },
      );
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title="Registrar una ronda"
      subtitle={`${custody.vehicle.plate} · Agrega una evidencia del estado actual.`}
      onClose={busy ? () => {} : onClose}
    >
      {!!error && <Notice kind="error" text={error} />}
      <Text style={s.fieldLabel}>Estado del vehículo</Text>
      <View style={s.wrap}>
        <Chip
          label="Todo en orden"
          icon="checkmark-circle-outline"
          selected={status === "ok"}
          onPress={() => setStatus("ok")}
        />
        <Chip
          label="Reportar incidencia"
          icon="warning-outline"
          selected={status === "incident"}
          onPress={() => setStatus("incident")}
        />
      </View>
      {photo ? (
        <Image
          source={{ uri: photo.imageData }}
          style={{ height: 180, width: "100%", borderRadius: 14 }}
          resizeMode="cover"
        />
      ) : demo ? (
        <View
          style={{
            padding: 25,
            alignItems: "center",
            gap: 8,
            backgroundColor: C.amberLight,
            borderRadius: 13,
          }}
        >
          <Icon name="image-outline" color={C.amber} size={38} />
          <Text style={s.text}>Se adjuntará una imagen de prueba</Text>
        </View>
      ) : null}
      <View style={s.wrap}>
        <Button
          variant="secondary"
          busy={mediaBusy}
          onPress={() => pick(true)}
          icon="camera-outline"
        >
          Tomar foto
        </Button>
        <Button
          variant="secondary"
          busy={mediaBusy}
          onPress={() => pick(false)}
          icon="images-outline"
        >
          Seleccionar imagen
        </Button>
        {demoMode && (
          <Button
            variant="ghost"
            onPress={() => {
              setDemo(true);
              setPhoto(null);
            }}
            testID="round-demo-image"
          >
            Usar imagen de prueba
          </Button>
        )}
      </View>
      <Field
        label={
          status === "incident" ? "Describe la incidencia" : "Observaciones"
        }
        value={note}
        onChangeText={setNote}
        placeholder={
          status === "incident"
            ? "Explica qué ocurrió y qué observaste."
            : "Ej. Vehículo sin novedades durante la ronda."
        }
        multiline
        maxLength={1000}
        testID="round-note"
      />
      <LocationPicker value={point} onChange={setPoint} demoMode={demoMode} />
      <Button
        onPress={submit}
        busy={busy}
        disabled={mediaBusy}
        icon="checkmark"
        testID="round-submit"
      >
        Guardar ronda
      </Button>
    </Sheet>
  );
}

export function CloseSheet({
  api,
  custody,
  onClose,
  onSaved,
}: {
  api: Api;
  custody: Custody;
  onClose: () => void;
  onSaved: (custody: Custody) => void;
}) {
  const [outcome, setOutcome] = useState<"conforme" | "observacion">(
    "conforme",
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (outcome === "observacion" && !note.trim()) {
      setError("Describe la observación antes de cerrar la custodia.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { custody: updated } = await api.post<{ custody: Custody }>(
        `/custodies/${custody.id}/close`,
        { outcome, note: note.trim() },
      );
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title="Confirmar entrega del vehículo"
      subtitle="Revisa las evidencias iniciales y finales antes de confirmar."
      onClose={busy ? () => {} : onClose}
    >
      {!!error && <Notice kind="error" text={error} />}
      <View style={s.wrap}>
        <Chip
          label="Recibido conforme"
          icon="checkmark-circle-outline"
          selected={outcome === "conforme"}
          onPress={() => setOutcome("conforme")}
        />
        <Chip
          label="Con observación"
          icon="alert-circle-outline"
          selected={outcome === "observacion"}
          onPress={() => setOutcome("observacion")}
        />
      </View>
      <Field
        label={
          outcome === "observacion"
            ? "Observación del cierre"
            : "Comentario (opcional)"
        }
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={1000}
        placeholder="Escribe tu valoración de la entrega."
        testID="close-note"
      />
      <Notice text="Al confirmar, la custodia finalizará y se conservará en tu historial." />
      <Button
        onPress={submit}
        busy={busy}
        icon="checkmark-done-outline"
        testID="confirm-close"
      >
        Confirmar cierre de custodia
      </Button>
    </Sheet>
  );
}
