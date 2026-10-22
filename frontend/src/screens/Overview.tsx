import React from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import type { Custody, User, Vehicle } from "../types";
import { formatDate, isOpen } from "../lib/format";
import {
  Button,
  C,
  Card,
  Empty,
  Heading,
  Icon,
  Metric,
  Section,
  StatusBadge,
  s,
} from "../components/ui";

export function CustodyCard({
  custody,
  onPress,
}: {
  custody: Custody;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver custodia ${custody.vehicle.plate}`}
      testID={`custody-card-${custody.code}`}
      onPress={onPress}
      style={({ pressed }) => [
        o.custodyCard,
        pressed && { backgroundColor: "#F5FAF7" },
      ]}
    >
      <View style={s.headingRow}>
        <View style={s.row}>
          <View style={o.carMark}>
            <Icon name="car-sport-outline" color={C.teal} size={27} />
          </View>
          <View style={{ gap: 4 }}>
            <Text style={o.plate}>{custody.vehicle.plate}</Text>
            <Text style={s.hint}>
              {custody.vehicle.brand} {custody.vehicle.model}
            </Text>
          </View>
        </View>
        <StatusBadge status={custody.status} />
      </View>
      <View style={[s.row, { marginTop: 19 }]}>
        <Icon name="location-outline" color={C.muted} size={16} />
        <Text numberOfLines={1} style={[s.subtitle, { flex: 1, fontSize: 12 }]}>
          {custody.locationLabel}
        </Text>
      </View>
      <View
        style={[
          s.headingRow,
          {
            marginTop: 17,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: C.border,
          },
        ]}
      >
        <Text style={s.hint}>{formatDate(custody.createdAt)}</Text>
        <Icon name="arrow-forward" color={C.teal} size={19} />
      </View>
    </Pressable>
  );
}
export function Overview({
  user,
  custodies,
  vehicles,
  onNew,
  onAccept,
  onCustody,
  onVehicles,
  onAll,
}: {
  user: User;
  custodies: Custody[];
  vehicles: Vehicle[];
  onNew: () => void;
  onAccept: () => void;
  onCustody: (id: string) => void;
  onVehicles: () => void;
  onAll: () => void;
}) {
  const wide = useWindowDimensions().width >= 1050;
  const open = custodies.filter((c) => isOpen(c.status));
  const active = custodies.filter((c) => c.status === "active").length;
  const closed = custodies.filter((c) => c.status === "closed").length;
  return (
    <View style={{ gap: 26 }}>
      <Heading
        title={`Hola, ${user.name.split(" ")[0]}`}
        subtitle={
          user.role === "owner"
            ? "Una vista de todo lo que pasa con tu vehículo."
            : "Tu próxima ronda empieza con un buen registro."
        }
      />
      <View style={[o.welcome, !wide && { padding: 23 }]}>
        <View style={{ flex: 1, gap: 12, maxWidth: 650 }}>
          <Text style={[s.eyebrow, { color: C.lime }]}>
            CADA PARADA, BIEN CUIDADA
          </Text>
          <Text style={o.welcomeTitle}>
            {user.role === "owner"
              ? "Deja tu auto. Lleva la tranquilidad."
              : "Tu cuidado hace la diferencia."}
          </Text>
          <Text style={o.welcomeText}>
            {user.role === "owner"
              ? "Inicia una custodia, registra el estado de tu auto y sigue cada ronda de cuidado."
              : "Vincula una custodia y registra las evidencias que mantienen informado al propietario."}
          </Text>
          <Button
            variant="secondary"
            icon={user.role === "owner" ? "add" : "qr-code-outline"}
            onPress={user.role === "owner" ? onNew : onAccept}
            testID={
              user.role === "owner" ? "custody-create" : "custody-accept-open"
            }
            style={{
              alignSelf: "flex-start",
              backgroundColor: C.lime,
              borderColor: C.lime,
            }}
          >
            {user.role === "owner"
              ? "Iniciar nueva custodia"
              : "Vincular una custodia"}
          </Button>
        </View>
        {wide && (
          <View style={o.welcomeIcon}>
            <Icon name="shield-checkmark-outline" size={93} color={C.lime} />
            <View style={o.smallCar}>
              <Icon name="car-sport" size={35} color={C.navy} />
            </View>
          </View>
        )}
      </View>
      <View style={[s.wrap, { alignItems: "stretch", gap: 14 }]}>
        <Metric
          label="En custodia"
          value={active}
          icon="shield-checkmark-outline"
          note="Sesiones activas"
        />
        <Metric
          label="Por completar"
          value={open.length - active}
          icon="time-outline"
          note="Vinculación o confirmación"
        />
        <Metric
          label="Finalizadas"
          value={closed}
          icon="checkmark-done-outline"
          note="Historial disponible"
        />
      </View>
      <View style={{ gap: 16 }}>
        <Section
          title="Tus custodias"
          subtitle="El estado de cada vehículo, a un toque."
          right={
            <Button variant="ghost" onPress={onAll} icon="arrow-forward">
              Ver todas
            </Button>
          }
        />
        {open.length ? (
          <View style={[s.wrap, { alignItems: "stretch", gap: 16 }]}>
            {open.slice(0, 4).map((c) => (
              <View key={c.id} style={{ flex: 1, minWidth: 265 }}>
                <CustodyCard custody={c} onPress={() => onCustody(c.id)} />
              </View>
            ))}
          </View>
        ) : (
          <Card>
            <Empty
              title="Todo listo para empezar"
              text={
                user.role === "owner"
                  ? "Crea tu primera custodia para registrar la entrega y seguir el cuidado de tu auto."
                  : "Solicita el código al propietario para vincular tu primera custodia."
              }
              icon="car-sport-outline"
              action={
                <Button
                  onPress={user.role === "owner" ? onNew : onAccept}
                  variant="secondary"
                >
                  {user.role === "owner"
                    ? "Crear primera custodia"
                    : "Ingresar código"}
                </Button>
              }
            />
          </Card>
        )}
      </View>
      <View style={[s.wrap, { alignItems: "stretch", gap: 16 }]}>
        <Card style={{ flex: 1, minWidth: 260, gap: 14 }}>
          <View style={s.row}>
            <Icon name="images-outline" color={C.teal} />
            <Text style={s.h3}>Una entrega bien registrada</Text>
          </View>
          <Text style={s.subtitle}>
            Agrega cuatro vistas del vehículo antes de vincular al cuidador:
            frente, atrás y ambos lados.
          </Text>
        </Card>
        <Card style={{ flex: 1, minWidth: 260, gap: 14 }}>
          <View style={s.row}>
            <Icon
              name={user.role === "owner" ? "car-outline" : "walk-outline"}
              color={C.teal}
            />
            <Text style={s.h3}>
              {user.role === "owner" ? "Tu garaje" : "Rondas con evidencia"}
            </Text>
          </View>
          <Text style={s.subtitle}>
            {user.role === "owner"
              ? `${vehicles.length} ${vehicles.length === 1 ? "vehículo registrado" : "vehículos registrados"}. Mantén sus datos al día para la próxima custodia.`
              : "Cada ronda reúne una fotografía, el estado del vehículo y tus observaciones."}
          </Text>
          {user.role === "owner" && (
            <Button
              variant="ghost"
              onPress={onVehicles}
              style={{ alignSelf: "flex-start", paddingLeft: 0 }}
              icon="arrow-forward"
            >
              Gestionar vehículos
            </Button>
          )}
        </Card>
      </View>
    </View>
  );
}
export function CustodiesList({
  custodies,
  history,
  user,
  onOpen,
  onNew,
  onAccept,
}: {
  custodies: Custody[];
  history?: boolean;
  user: User;
  onOpen: (id: string) => void;
  onNew: () => void;
  onAccept: () => void;
}) {
  const rows = custodies.filter((c) =>
    history ? !isOpen(c.status) : isOpen(c.status),
  );
  return (
    <View style={s.stack}>
      <Heading
        title={history ? "Historial de cuidado" : "Mis custodias"}
        subtitle={
          history
            ? "Consulta las evidencias y el cierre de tus custodias anteriores."
            : "Acompaña cada etapa, desde la entrega hasta el cierre."
        }
      />
      {!history && (
        <View style={{ alignItems: "flex-start" }}>
          <Button
            variant="secondary"
            icon={user.role === "owner" ? "add" : "qr-code-outline"}
            onPress={user.role === "owner" ? onNew : onAccept}
            testID={
              user.role === "owner" ? "custody-create" : "custody-accept-open"
            }
          >
            {user.role === "owner" ? "Nueva custodia" : "Vincular custodia"}
          </Button>
        </View>
      )}
      {rows.length ? (
        <View style={[s.wrap, { alignItems: "stretch", gap: 16 }]}>
          {rows.map((c) => (
            <View
              key={c.id}
              style={{ flexBasis: 310, flexGrow: 1, maxWidth: 520 }}
            >
              <CustodyCard custody={c} onPress={() => onOpen(c.id)} />
            </View>
          ))}
        </View>
      ) : (
        <Card>
          <Empty
            title={
              history
                ? "Tu historial comienza aquí"
                : "Sin custodias pendientes"
            }
            text={
              history
                ? "Las custodias que finalices aparecerán en esta sección con sus evidencias."
                : "Cuando inicies o vincules una custodia, podrás seguirla aquí."
            }
            icon={history ? "time-outline" : "shield-checkmark-outline"}
          />
        </Card>
      )}
    </View>
  );
}
export function VehiclesList({
  vehicles,
  onAdd,
  onEdit,
}: {
  vehicles: Vehicle[];
  onAdd: () => void;
  onEdit: (v: Vehicle) => void;
}) {
  return (
    <View style={s.stack}>
      <Heading
        title="Mis vehículos"
        subtitle="Los datos de tu auto, listos para la próxima parada."
      />
      <View style={{ alignItems: "flex-start" }}>
        <Button onPress={onAdd} icon="add" testID="vehicle-add">
          Agregar vehículo
        </Button>
      </View>
      {vehicles.length ? (
        <View style={[s.wrap, { alignItems: "stretch", gap: 16 }]}>
          {vehicles.map((v) => (
            <Card
              key={v.id}
              style={{ flexBasis: 300, flexGrow: 1, maxWidth: 480, gap: 18 }}
            >
              <View style={s.headingRow}>
                <View style={o.carMark}>
                  <Icon name="car-sport" size={31} color={C.teal} />
                </View>
                <Text style={o.vehiclePlate}>{v.plate}</Text>
              </View>
              <View style={{ gap: 5 }}>
                <Text style={s.h2}>
                  {v.brand} {v.model}
                </Text>
                <Text style={s.subtitle}>{v.color}</Text>
              </View>
              <Button
                onPress={() => onEdit(v)}
                variant="secondary"
                icon="create-outline"
                testID={`vehicle-edit-${v.plate}`}
              >
                Editar vehículo
              </Button>
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Empty
            title="Agrega tu primer vehículo"
            text="Registra la placa, marca, modelo y color para empezar una custodia."
            icon="car-outline"
            action={<Button onPress={onAdd}>Registrar vehículo</Button>}
          />
        </Card>
      )}
    </View>
  );
}
const o = StyleSheet.create({
  welcome: {
    borderRadius: 22,
    padding: 30,
    backgroundColor: C.navy,
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    overflow: "hidden",
  },
  welcomeTitle: {
    color: C.white,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.6,
    fontWeight: "700",
  },
  welcomeText: {
    color: "#B7CED1",
    fontSize: 13,
    lineHeight: 22,
    maxWidth: 510,
  },
  welcomeIcon: {
    width: 155,
    height: 155,
    borderRadius: 100,
    backgroundColor: "#1B414C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#305763",
  },
  smallCar: {
    position: "absolute",
    bottom: 3,
    right: -7,
    width: 60,
    height: 55,
    backgroundColor: C.lime,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  custodyCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
  },
  carMark: {
    width: 51,
    height: 51,
    backgroundColor: C.tealLight,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  plate: { color: C.ink, fontSize: 17, fontWeight: "800", letterSpacing: 0.7 },
  vehiclePlate: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 7,
    color: C.ink,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
});
