import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Api } from "../lib/api";
import { errorMessage, formatDate } from "../lib/format";
import { choosePhoto } from "../lib/media";
import type { Custody, Evidence, User } from "../types";
import {
  Button,
  C,
  Card,
  Divider,
  Empty,
  Icon,
  Loading,
  Notice,
  Section,
  Sheet,
  StatusBadge,
  s,
} from "../components/ui";
import { CloseSheet, RoundSheet } from "./Forms";

export function CustodyDetail({
  id,
  api,
  user,
  demoMode,
  onBack,
  onChanged,
  refreshKey = 0,
}: {
  id: string;
  api: Api;
  user: User;
  demoMode: boolean;
  onBack: () => void;
  onChanged: (c: Custody) => void;
  refreshKey?: number;
}) {
  const [custody, setCustody] = useState<Custody | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roundOpen, setRoundOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState<Evidence | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const wide = useWindowDimensions().width >= 1100;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.get<{ custody: Custody }>(`/custodies/${id}`);
      setCustody(result.custody);
      onChanged(result.custody);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id, api, onChanged]);
  useEffect(() => {
    void load();
  }, [load, refreshKey]);
  function updated(
    value: Custody,
    message = "Registro guardado correctamente.",
  ) {
    setCustody(value);
    onChanged(value);
    setSuccess(message);
    setError("");
  }
  async function action(
    path: string,
    body: unknown,
    label: string,
    message: string,
  ) {
    setBusy(label);
    setError("");
    setSuccess("");
    try {
      const { custody: value } = await api.post<{ custody: Custody }>(
        `/custodies/${id}/${path}`,
        body,
      );
      updated(value, message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function addPhoto(phase: "initial" | "final", camera: boolean) {
    setBusy(`${phase}-photo`);
    setError("");
    setSuccess("");
    try {
      const photo = await choosePhoto(camera);
      if (photo) {
        const { custody: value } = await api.post<{ custody: Custody }>(
          `/custodies/${id}/evidence`,
          { phase, ...photo },
        );
        updated(value, "Evidencia agregada a la custodia.");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  if (loading && !custody) return <Loading text="Abriendo la custodia…" />;
  if (!custody)
    return (
      <View style={s.stack}>
        <Button onPress={onBack} variant="ghost" icon="arrow-back">
          Volver a mis custodias
        </Button>
        <Notice kind="error" text={error || "No se encontró la custodia."} />
        <Button onPress={load}>Volver a intentar</Button>
      </View>
    );
  const owner = user.role === "owner";
  const initial = custody.evidence.filter((e) => e.phase === "initial");
  const final = custody.evidence.filter((e) => e.phase === "final");
  const rounds = [...custody.rounds].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const canInitial = owner && custody.status === "pending";
  const canFinal = !owner && custody.status === "active";
  const steps = [
    { label: "Entrega registrada", done: true },
    { label: "Cuidador vinculado", done: !!custody.caretakerId },
    { label: "Rondas de cuidado", done: !!rounds.length },
    { label: "Custodia finalizada", done: custody.status === "closed" },
  ];
  function photoGroup(
    phase: "initial" | "final",
    evidence: Evidence[],
    canEdit: boolean,
  ) {
    return (
      <Card style={{ flex: 1, minWidth: 260, gap: 16 }}>
        <Section
          title={
            phase === "initial"
              ? "Evidencias de entrega"
              : "Evidencias de devolución"
          }
          subtitle={`${evidence.length} ${evidence.length === 1 ? "imagen registrada" : "imágenes registradas"} · ${phase === "initial" ? "Antes de iniciar" : "Al finalizar el cuidado"}`}
          right={
            <View style={d.countBadge}>
              <Text style={d.countText}>{Math.min(evidence.length, 4)}/4</Text>
            </View>
          }
        />
        {evidence.length ? (
          <View style={d.photoGrid}>
            {evidence.map((e, i) => (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver evidencia ${phase === "initial" ? "inicial" : "final"} ${i + 1}`}
                onPress={() => setPhotoOpen(e)}
                style={d.photoCell}
              >
                <Image
                  source={{ uri: e.imageData }}
                  style={d.photoThumb}
                  resizeMode="cover"
                />
                <View style={{ padding: 8, gap: 3 }}>
                  <Text style={d.photoLabel}>
                    {e.position || `Vista ${i + 1}`}
                  </Text>
                  <Text
                    style={[
                      s.hint,
                      {
                        fontSize: 10,
                        color: e.source === "demo" ? C.amber : C.muted,
                      },
                    ]}
                  >
                    {e.source === "demo"
                      ? "Imagen de prueba"
                      : e.source === "camera"
                        ? "Capturada con cámara"
                        : "Imagen seleccionada"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={d.photoEmpty}>
            <Icon name="images-outline" color="#93A9AC" size={35} />
            <Text style={s.hint}>Las imágenes aparecerán aquí.</Text>
          </View>
        )}
        {canEdit && (
          <>
            <Text style={s.hint}>
              Registra al menos cuatro vistas: frente, atrás, lado izquierdo y
              lado derecho. Máximo ocho imágenes por etapa.
            </Text>
            <View style={s.wrap}>
              <Button
                variant="secondary"
                onPress={() => addPhoto(phase, true)}
                icon="camera-outline"
                disabled={!!busy || evidence.length >= 8}
              >
                Cámara
              </Button>
              <Button
                variant="secondary"
                onPress={() => addPhoto(phase, false)}
                icon="image-outline"
                disabled={!!busy || evidence.length >= 8}
              >
                Seleccionar
              </Button>
            </View>
            {demoMode && evidence.length < 4 && (
              <Button
                variant="ghost"
                icon="flask-outline"
                onPress={() =>
                  action(
                    "demo-evidence",
                    { phase },
                    `${phase}-demo`,
                    "Imágenes de prueba guardadas.",
                  )
                }
                busy={busy === `${phase}-demo`}
                disabled={!!busy}
                testID={`demo-evidence-${phase}`}
              >
                Completar con imágenes de prueba
              </Button>
            )}
          </>
        )}
      </Card>
    );
  }
  return (
    <View style={{ gap: 22 }}>
      <View style={s.headingRow}>
        <Button
          variant="ghost"
          onPress={onBack}
          icon="arrow-back"
          style={{ paddingLeft: 0 }}
        >
          Mis custodias
        </Button>
        <Button
          variant="secondary"
          onPress={load}
          icon="refresh-outline"
          busy={loading}
          disabled={!!busy}
          testID="custody-refresh"
        >
          Actualizar
        </Button>
      </View>
      {!!error && (
        <Notice text={error} kind="error" onDismiss={() => setError("")} />
      )}
      {!!success && (
        <Notice
          text={success}
          kind="success"
          onDismiss={() => setSuccess("")}
        />
      )}
      <Card style={{ padding: 25, gap: 23 }}>
        <View style={[s.headingRow, { flexWrap: "wrap" }]}>
          <View style={s.row}>
            <View style={d.carMark}>
              <Icon name="car-sport" size={39} color={C.teal} />
            </View>
            <View style={{ gap: 5 }}>
              <Text style={d.plate}>{custody.vehicle.plate}</Text>
              <Text style={s.subtitle}>
                {custody.vehicle.brand} {custody.vehicle.model} ·{" "}
                {custody.vehicle.color}
              </Text>
            </View>
          </View>
          <StatusBadge status={custody.status} />
        </View>
        <Divider />
        <View style={d.steps}>
          {steps.map((step, i) => (
            <View key={step.label} style={d.step}>
              <View
                style={[
                  d.stepCircle,
                  step.done && { backgroundColor: C.teal, borderColor: C.teal },
                ]}
              >
                {step.done ? (
                  <Icon name="checkmark" size={15} color={C.white} />
                ) : (
                  <Text style={[s.hint, { fontWeight: "700" }]}>{i + 1}</Text>
                )}
              </View>
              <Text style={[d.stepText, step.done && { color: C.ink }]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>
      <View style={[s.wrap, { alignItems: "stretch", gap: 18 }]}>
        <Card style={{ flex: 1, minWidth: 260, gap: 17 }}>
          <Section title="Detalles de la custodia" />
          <Info
            icon="location-outline"
            label="Lugar"
            value={custody.locationLabel}
          />
          <Info
            icon="person-outline"
            label="Propietario"
            value={custody.ownerName}
          />
          <Info
            icon="shield-checkmark-outline"
            label="Cuidador"
            value={custody.caretakerName || "Pendiente de vinculación"}
          />
          <Info
            icon="time-outline"
            label="Frecuencia acordada"
            value={`Una ronda cada ${custody.roundIntervalMinutes} minutos`}
          />
          <Info
            icon="calendar-outline"
            label="Registrada"
            value={formatDate(custody.createdAt)}
          />
          {custody.latitude !== null && custody.longitude !== null && (
            <Info
              icon="locate-outline"
              label={
                custody.locationSource === "demo"
                  ? "Ubicación de prueba"
                  : "Coordenadas registradas"
              }
              value={`${Number(custody.latitude).toFixed(5)}, ${Number(custody.longitude).toFixed(5)}`}
            />
          )}
        </Card>
        {owner && custody.status === "pending" ? (
          <Card
            style={{ flex: 1, minWidth: 260, gap: 15, alignItems: "center" }}
          >
            <Text style={s.h2}>Vincula a tu cuidador</Text>
            <Text style={[s.subtitle, { textAlign: "center" }]}>
              Comparte el QR o el código de esta custodia.
            </Text>
            <View style={d.qrFrame}>
              <QRCode
                value={custody.qrPayload}
                size={155}
                color={C.navy}
                backgroundColor={C.white}
              />
            </View>
            <Text selectable testID="custody-code" style={d.code}>
              {custody.code}
            </Text>
            <Text style={[s.hint, { textAlign: "center" }]}>
              El cuidador puede ingresar este código manualmente.
            </Text>
            {initial.length < 4 && (
              <Notice
                text={`Faltan ${4 - initial.length} evidencias iniciales para aceptar la custodia.`}
              />
            )}
          </Card>
        ) : (
          <Card style={{ flex: 1, minWidth: 260, gap: 17 }}>
            <Section
              title={
                custody.status === "closed"
                  ? "Resumen del cierre"
                  : "El siguiente paso"
              }
            />
            <View style={d.nextIcon}>
              <Icon
                name={
                  custody.status === "closed"
                    ? "checkmark-done-outline"
                    : custody.status === "cancelled"
                      ? "close-circle-outline"
                      : "shield-checkmark-outline"
                }
                size={34}
                color={C.teal}
              />
            </View>
            <Text style={s.h2}>
              {custody.status === "closed"
                ? custody.closeOutcome === "observacion"
                  ? "Finalizada con observación"
                  : "Vehículo recibido conforme"
                : custody.status === "cancelled"
                  ? "Custodia cancelada"
                  : custody.status === "awaiting_confirmation"
                    ? "Esperando la confirmación del propietario"
                    : owner
                      ? "Tu vehículo está en custodia"
                      : "Registra el cuidado de este vehículo"}
            </Text>
            <Text style={s.subtitle}>
              {custody.status === "closed"
                ? `Cierre registrado el ${formatDate(custody.endedAt)}. Las evidencias se conservan en el historial.`
                : custody.status === "cancelled"
                  ? "Este registro se conserva para consulta."
                  : custody.status === "awaiting_confirmation"
                    ? "Las evidencias finales están listas. El propietario puede revisar y confirmar la entrega."
                    : owner
                      ? "Consulta las rondas registradas y actualiza esta pantalla para ver los últimos cambios."
                      : "Toma una fotografía en cada ronda y registra cualquier novedad que deba conocer el propietario."}
            </Text>
            {custody.closeNote && (
              <Notice
                text={`Comentario de cierre: ${custody.closeNote}`}
                kind={
                  custody.closeOutcome === "observacion" ? "info" : "success"
                }
              />
            )}
            {!owner && custody.status === "active" && (
              <Button
                icon="add-circle-outline"
                onPress={() => setRoundOpen(true)}
                disabled={!!busy}
                testID="round-open"
              >
                Registrar ronda
              </Button>
            )}
            {owner && custody.status === "awaiting_confirmation" && (
              <Button
                icon="checkmark-done-outline"
                onPress={() => setCloseOpen(true)}
                disabled={!!busy}
                testID="close-review-open"
              >
                Revisar y confirmar cierre
              </Button>
            )}
          </Card>
        )}
      </View>
      <View style={{ gap: 13 }}>
        <Section
          title="Registro visual"
          subtitle="Compara el estado del vehículo al recibirlo y al devolverlo."
        />
        <View
          style={[
            s.wrap,
            { alignItems: "stretch", gap: 18 },
            !wide && { flexDirection: "column", alignItems: "stretch" },
          ]}
        >
          {photoGroup("initial", initial, canInitial)}
          {photoGroup("final", final, canFinal)}
        </View>
      </View>
      {canFinal && (
        <Card style={{ gap: 14 }}>
          <Section
            title="¿Terminó el cuidado?"
            subtitle="Completa cuatro evidencias finales y solicita la confirmación del propietario."
          />
          <Button
            onPress={() =>
              action(
                "request-close",
                {},
                "request-close",
                "Solicitud enviada. El propietario ya puede confirmar la entrega.",
              )
            }
            busy={busy === "request-close"}
            disabled={!!busy || final.length < 4}
            icon="checkmark-done-outline"
            testID="request-close"
          >
            Solicitar cierre de custodia
          </Button>
        </Card>
      )}
      <Card style={{ gap: 20 }}>
        <Section
          title="Rondas de cuidado"
          subtitle={`${rounds.length} ${rounds.length === 1 ? "ronda registrada" : "rondas registradas"}`}
          right={
            !owner && custody.status === "active" ? (
              <Button
                variant="secondary"
                icon="add"
                onPress={() => setRoundOpen(true)}
                disabled={!!busy}
              >
                Nueva ronda
              </Button>
            ) : undefined
          }
        />
        {rounds.length ? (
          rounds.map((round) => {
            const evidence = custody.evidence.find(
              (e) => e.roundId === round.id,
            );
            return (
              <View key={round.id} style={d.round}>
                <View
                  style={[
                    d.roundIcon,
                    {
                      backgroundColor:
                        round.status === "incident"
                          ? C.amberLight
                          : C.tealLight,
                    },
                  ]}
                >
                  <Icon
                    name={
                      round.status === "incident"
                        ? "warning-outline"
                        : "checkmark-circle-outline"
                    }
                    color={round.status === "incident" ? C.amber : C.teal}
                    size={24}
                  />
                </View>
                <View style={{ flex: 1, gap: 7 }}>
                  <Text style={s.h3}>
                    {round.status === "incident"
                      ? "Incidencia registrada"
                      : "Vehículo en orden"}
                  </Text>
                  <Text style={s.hint}>{formatDate(round.createdAt)}</Text>
                  {!!round.note && <Text style={s.text}>{round.note}</Text>}
                  {round.latitude !== null && round.longitude !== null && (
                    <Text style={s.hint}>
                      {round.locationSource === "demo"
                        ? "Ubicación de prueba"
                        : "Ubicación registrada"}{" "}
                      · {Number(round.latitude).toFixed(5)},{" "}
                      {Number(round.longitude).toFixed(5)}
                    </Text>
                  )}
                  {evidence && (
                    <Pressable
                      onPress={() => setPhotoOpen(evidence)}
                      accessibilityLabel="Ver evidencia de la ronda"
                      style={{ alignSelf: "flex-start", gap: 5 }}
                    >
                      <Image
                        source={{ uri: evidence.imageData }}
                        style={{ width: 145, height: 100, borderRadius: 9 }}
                      />
                      <Text
                        style={[
                          s.hint,
                          evidence.source === "demo" && { color: C.amber },
                        ]}
                      >
                        {evidence.source === "demo"
                          ? "Imagen de prueba"
                          : "Ver evidencia"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <Empty
            title="Aún no hay rondas"
            text="Cuando el cuidador registre una ronda, podrás consultar aquí su fotografía y observaciones."
            icon="walk-outline"
          />
        )}
      </Card>
      {canInitial && (
        <View style={{ gap: 10, alignItems: "flex-start" }}>
          {cancelConfirm ? (
            <>
              <Notice text="La custodia se cancelará antes de vincular al cuidador y quedará en el historial." />
              <View style={s.wrap}>
                <Button
                  variant="secondary"
                  onPress={() => setCancelConfirm(false)}
                  disabled={!!busy}
                >
                  Conservar custodia
                </Button>
                <Button
                  variant="danger"
                  onPress={() =>
                    action("cancel", {}, "cancel", "Custodia cancelada.")
                  }
                  busy={busy === "cancel"}
                  disabled={!!busy}
                  testID="custody-cancel-confirm"
                >
                  Confirmar cancelación
                </Button>
              </View>
            </>
          ) : (
            <Button
              variant="ghost"
              onPress={() => setCancelConfirm(true)}
              disabled={!!busy}
            >
              Cancelar esta custodia
            </Button>
          )}
        </View>
      )}
      {busy.endsWith("-photo") && (
        <View style={s.row}>
          <ActivityIndicator color={C.teal} />
          <Text style={s.hint}>Procesando y guardando la imagen…</Text>
        </View>
      )}
      {roundOpen && (
        <RoundSheet
          api={api}
          custody={custody}
          demoMode={demoMode}
          onClose={() => setRoundOpen(false)}
          onSaved={(value) =>
            updated(
              value,
              "Ronda registrada. El propietario puede consultar la evidencia.",
            )
          }
        />
      )}
      {closeOpen && (
        <CloseSheet
          api={api}
          custody={custody}
          onClose={() => setCloseOpen(false)}
          onSaved={(value) =>
            updated(
              value,
              "Custodia finalizada. Ya está disponible en el historial.",
            )
          }
        />
      )}
      {photoOpen && (
        <Sheet
          title={
            photoOpen.source === "demo"
              ? "Evidencia · Imagen de prueba"
              : "Evidencia del vehículo"
          }
          subtitle={`Registrada el ${formatDate(photoOpen.createdAt)}`}
          onClose={() => setPhotoOpen(null)}
          width={760}
        >
          <Image
            source={{ uri: photoOpen.imageData }}
            style={{
              height: 380,
              width: "100%",
              backgroundColor: C.bg,
              borderRadius: 12,
            }}
            resizeMode="contain"
          />
          {photoOpen.source === "demo" && (
            <Notice text="Esta imagen de ejemplo se utiliza para demostrar el flujo del prototipo." />
          )}
          {!!photoOpen.note && <Text style={s.text}>{photoOpen.note}</Text>}
          <Text style={s.hint}>
            La fecha corresponde al registro en el sistema.
          </Text>
        </Sheet>
      )}
    </View>
  );
}
function Info({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={[s.row, { alignItems: "flex-start" }]}>
      <Icon name={icon} size={19} color={C.muted} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.hint}>{label}</Text>
        <Text style={[s.text, { fontSize: 13, fontWeight: "500" }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}
const d = StyleSheet.create({
  carMark: {
    backgroundColor: C.tealLight,
    width: 65,
    height: 65,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  plate: { fontSize: 25, fontWeight: "800", color: C.ink, letterSpacing: 1.2 },
  steps: { flexDirection: "row", gap: 10 },
  step: { flex: 1, gap: 8 },
  stepCircle: {
    width: 27,
    height: 27,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { color: C.muted, fontSize: 10, lineHeight: 15 },
  qrFrame: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginVertical: 2,
  },
  code: {
    color: C.ink,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 1.4,
    textAlign: "center",
  },
  nextIcon: {
    width: 65,
    height: 65,
    borderRadius: 24,
    backgroundColor: C.tealLight,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadge: {
    backgroundColor: C.tealLight,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  countText: { color: C.teal, fontWeight: "700", fontSize: 12 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoCell: {
    width: "47.5%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  photoThumb: { width: "100%", height: 120 },
  photoLabel: { fontSize: 11, fontWeight: "600", color: C.ink },
  photoEmpty: {
    minHeight: 145,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FAFCFA",
  },
  round: {
    flexDirection: "row",
    gap: 14,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  roundIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
