import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Api, ApiError, DEFAULT_API_URL } from "./src/lib/api";
import {
  loadApiUrl,
  loadSession,
  saveApiUrl,
  saveSession,
} from "./src/lib/storage";
import { errorMessage } from "./src/lib/format";
import type { Custody, Health, Session, Vehicle } from "./src/types";
import { AuthScreen, ConnectionSheet } from "./src/screens/Auth";
import { CustodiesList, Overview, VehiclesList } from "./src/screens/Overview";
import {
  AcceptSheet,
  NewCustodySheet,
  VehicleSheet,
} from "./src/screens/Forms";
import { CustodyDetail } from "./src/screens/CustodyDetail";
import {
  Button,
  C,
  Card,
  Divider,
  Heading,
  Icon,
  IconName,
  Loading,
  Logo,
  Notice,
  s,
} from "./src/components/ui";

type Tab = "home" | "vehicles" | "custodies" | "history" | "profile";
type Nav = { id: Tab; label: string; icon: IconName };
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const width = useWindowDimensions().width;
  const desktop = width >= 900;
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [health, setHealth] = useState<Health | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [selected, setSelected] = useState<string | null>(null);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const generation = useRef(0);
  const scroll = useRef<ScrollView>(null);
  const clearSession = useCallback(async (message = "") => {
    generation.current += 1;
    setSession(null);
    setVehicles([]);
    setCustodies([]);
    setSelected(null);
    setLoaded(false);
    setError("");
    setTab("home");
    setAuthNotice(message);
    setVehicleOpen(false);
    setNewOpen(false);
    setAcceptOpen(false);
    try {
      await saveSession(null);
    } catch {
      /* La sesión en memoria ya se cerró. */
    }
  }, []);
  const onUnauthorized = useCallback(() => {
    void clearSession("Tu sesión terminó. Ingresa de nuevo para continuar.");
  }, [clearSession]);
  const api = useMemo(
    () => new Api(apiUrl, session?.token || null, onUnauthorized),
    [apiUrl, session?.token, onUnauthorized],
  );
  useEffect(() => {
    let active = true;
    (async () => {
      const [storedUrl, saved] = await Promise.all([
        loadApiUrl(),
        loadSession(),
      ]);
      const url = storedUrl || DEFAULT_API_URL;
      if (!active) return;
      setApiUrl(url);
      if (saved) {
        try {
          const result = await new Api(url, saved.token).get<{
            user: Session["user"];
          }>("/auth/me");
          if (active) setSession({ token: saved.token, user: result.user });
        } catch (e) {
          if (active && !(e instanceof ApiError && e.status === 401)) {
            setSession(saved);
            setError(errorMessage(e));
          } else {
            await saveSession(null);
          }
        }
      }
      if (active) setBooting(false);
    })().catch(() => {
      if (active) setBooting(false);
    });
    return () => {
      active = false;
    };
  }, []);
  const reload = useCallback(async () => {
    if (!session) return;
    const current = generation.current;
    setLoading(true);
    setError("");
    try {
      const [h, c, v] = await Promise.all([
        api.health(),
        api.get<{ custodies: Custody[] }>("/custodies"),
        session.user.role === "owner"
          ? api.get<{ vehicles: Vehicle[] }>("/vehicles")
          : Promise.resolve({ vehicles: [] }),
      ]);
      if (current !== generation.current) return;
      setHealth(h);
      setCustodies(c.custodies);
      setVehicles(v.vehicles);
      setLoaded(true);
    } catch (e) {
      if (current === generation.current) setError(errorMessage(e));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [session, api]);
  useEffect(() => {
    if (session) void reload();
  }, [reload, session]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [tab, selected]);
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selected) {
        setSelected(null);
        return true;
      }
      if (tab !== "home") {
        setTab("home");
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [selected, tab]);
  async function onSession(value: Session) {
    generation.current += 1;
    await saveSession(value);
    setSession(value);
    setAuthNotice("");
    setError("");
    setLoaded(false);
    setTab("home");
  }
  async function onConnection(url: string) {
    await clearSession();
    await saveApiUrl(url);
    setApiUrl(url);
    setConnectionOpen(false);
    setHealth(null);
  }
  function go(value: Tab) {
    setTab(value);
    setSelected(null);
  }
  const onChanged = useCallback((value: Custody) => {
    setCustodies((prev) =>
      prev.some((c) => c.id === value.id)
        ? prev.map((c) => (c.id === value.id ? value : c))
        : [value, ...prev],
    );
  }, []);
  async function onCreated(value: Custody) {
    onChanged(value);
    setTab("custodies");
    setSelected(value.id);
  }
  function openNew() {
    if (!vehicles.length) {
      go("vehicles");
      setEditingVehicle(null);
      setVehicleOpen(true);
    } else setNewOpen(true);
  }
  const nav: Nav[] = [
    { id: "home", label: "Inicio", icon: "grid-outline" },
    ...(session?.user.role === "owner"
      ? [
          {
            id: "vehicles" as const,
            label: "Vehículos",
            icon: "car-outline" as const,
          },
        ]
      : []),
    { id: "custodies", label: "Custodias", icon: "shield-checkmark-outline" },
    { id: "history", label: "Historial", icon: "time-outline" },
    { id: "profile", label: "Mi cuenta", icon: "person-outline" },
  ];
  if (booting)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <Loading text="Preparando CuidaTuAuto…" />
      </SafeAreaView>
    );
  const connection = connectionOpen ? (
    <ConnectionSheet
      currentUrl={apiUrl}
      onClose={() => setConnectionOpen(false)}
      onSave={onConnection}
    />
  ) : null;
  if (!session)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
        <StatusBar style="auto" />
        <AuthScreen
          api={api}
          onSession={onSession}
          onConnection={() => setConnectionOpen(true)}
          notice={authNotice}
        />
        {connection}
      </SafeAreaView>
    );
  const user = session.user;
  const content = selected ? (
    <CustodyDetail
      key={selected}
      id={selected}
      api={api}
      user={user}
      demoMode={!!health?.demoMode}
      refreshKey={detailRefresh}
      onBack={() => {
        setSelected(null);
        setTab("custodies");
      }}
      onChanged={onChanged}
    />
  ) : loading && !loaded ? (
    <Loading />
  ) : tab === "home" ? (
    <Overview
      user={user}
      custodies={custodies}
      vehicles={vehicles}
      onNew={openNew}
      onAccept={() => setAcceptOpen(true)}
      onCustody={setSelected}
      onVehicles={() => go("vehicles")}
      onAll={() => go("custodies")}
    />
  ) : tab === "vehicles" ? (
    <VehiclesList
      vehicles={vehicles}
      onAdd={() => {
        setEditingVehicle(null);
        setVehicleOpen(true);
      }}
      onEdit={(v) => {
        setEditingVehicle(v);
        setVehicleOpen(true);
      }}
    />
  ) : tab === "custodies" || tab === "history" ? (
    <CustodiesList
      custodies={custodies}
      history={tab === "history"}
      user={user}
      onOpen={setSelected}
      onNew={openNew}
      onAccept={() => setAcceptOpen(true)}
    />
  ) : (
    <View style={s.stack}>
      <Heading
        title="Mi cuenta"
        subtitle="Tu perfil y las preferencias del proyecto."
      />
      <Card style={{ gap: 23 }}>
        <View style={s.row}>
          <View style={x.avatarLarge}>
            <Text style={x.avatarLargeText}>
              {user.name
                .split(" ")
                .map((v) => v[0])
                .slice(0, 2)
                .join("")}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.h2}>{user.name}</Text>
            <Text style={s.subtitle}>{user.email}</Text>
            <Text style={[s.hint, { color: C.teal, fontWeight: "700" }]}>
              {user.role === "owner" ? "Propietario" : "Cuidador"}
            </Text>
          </View>
        </View>
        <Divider />
        <Text style={s.text}>
          Tu historial de custodias y las evidencias registradas se conservan al
          cerrar sesión.
        </Text>
        <Button
          variant="secondary"
          icon="options-outline"
          onPress={() => setConnectionOpen(true)}
          style={{ alignSelf: "flex-start" }}
        >
          Configurar conexión
        </Button>
        <Button
          variant="danger"
          onPress={() => {
            void clearSession();
          }}
          icon="log-out-outline"
          testID="logout"
          style={{ alignSelf: "flex-start" }}
        >
          Cerrar sesión
        </Button>
      </Card>
      <Card style={{ gap: 13 }}>
        <Text style={s.h3}>Acerca de esta versión</Text>
        <Text style={s.subtitle}>CuidaTuAuto · Prototipo académico v0.1.0</Text>
        <Text style={s.hint}>
          Las imágenes y ubicaciones de prueba se identifican en sus registros.
          La aplicación consulta cambios al actualizar; las notificaciones
          remotas y la ubicación en segundo plano quedan pendientes.
        </Text>
      </Card>
    </View>
  );
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: desktop ? C.bg : C.white }}
    >
      <StatusBar style="dark" />
      <View style={x.app}>
        {desktop && (
          <View style={x.sidebar}>
            <Logo />
            <View style={{ gap: 7, marginTop: 37 }}>
              {nav.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  testID={`nav-${item.id}`}
                  accessibilityState={{ selected: item.id === tab }}
                  onPress={() => go(item.id)}
                  style={[x.navItem, tab === item.id && x.navActive]}
                >
                  <Icon
                    name={item.icon}
                    size={20}
                    color={tab === item.id ? C.teal : C.muted}
                  />
                  <Text
                    style={[
                      x.navLabel,
                      tab === item.id && { color: C.teal, fontWeight: "700" },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.id === "custodies" &&
                    custodies.filter((c) =>
                      ["active", "awaiting_confirmation", "pending"].includes(
                        c.status,
                      ),
                    ).length > 0 && (
                      <View style={x.navCount}>
                        <Text style={x.navCountText}>
                          {
                            custodies.filter((c) =>
                              [
                                "active",
                                "awaiting_confirmation",
                                "pending",
                              ].includes(c.status),
                            ).length
                          }
                        </Text>
                      </View>
                    )}
                </Pressable>
              ))}
            </View>
            <View style={{ flex: 1 }} />
            <View style={x.sidebarNote}>
              <Icon name="leaf-outline" color={C.teal} size={22} />
              <Text style={x.sidebarNoteTitle}>Cada detalle cuenta.</Text>
              <Text style={s.hint}>
                Un buen registro también es una forma de cuidar.
              </Text>
            </View>
            <Divider />
            <Pressable
              onPress={() => go("profile")}
              accessibilityLabel="Abrir mi cuenta"
              style={[s.row, { paddingVertical: 15 }]}
            >
              <View style={x.avatar}>
                <Text style={x.avatarText}>{user.name[0]}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={x.userName} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text style={s.hint}>
                  {user.role === "owner" ? "Propietario" : "Cuidador"}
                </Text>
              </View>
              <Icon name="chevron-forward" size={16} color={C.muted} />
            </Pressable>
          </View>
        )}
        <View style={x.main}>
          <View
            style={[
              x.topbar,
              !desktop && { paddingHorizontal: 18, height: 72 },
            ]}
          >
            {desktop ? (
              <View style={s.row}>
                <Text style={s.hint}>Mi espacio</Text>
                <Icon name="chevron-forward" size={12} color={C.muted} />
                <Text style={[s.hint, { color: C.ink, fontWeight: "600" }]}>
                  {selected
                    ? "Detalle de custodia"
                    : nav.find((n) => n.id === tab)?.label}
                </Text>
              </View>
            ) : (
              <Logo />
            )}
            <View style={s.row}>
              {desktop && health?.demoMode && (
                <View style={x.demoPill}>
                  <Icon name="flask-outline" size={13} color={C.teal} />
                  <Text style={x.demoText}>Modo demostración</Text>
                </View>
              )}
              <Pressable
                onPress={() => {
                  void reload();
                  if (selected) setDetailRefresh((value) => value + 1);
                }}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Actualizar información"
                testID="global-refresh"
                style={s.iconButton}
              >
                <Icon name="refresh-outline" color={C.muted} size={20} />
              </Pressable>
              {desktop && (
                <View style={x.avatar}>
                  <Text style={x.avatarText}>{user.name[0]}</Text>
                </View>
              )}
            </View>
          </View>
          <ScrollView
            ref={scroll}
            style={{ flex: 1, backgroundColor: C.bg }}
            contentContainerStyle={[
              x.content,
              !desktop && { padding: 18, paddingTop: 24 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                width: "100%",
                maxWidth: 1220,
                alignSelf: "center",
                gap: 22,
              }}
            >
              {!!error && (
                <Notice
                  text={error}
                  kind="error"
                  onDismiss={() => setError("")}
                />
              )}
              {content}
              <View style={x.footer}>
                <Text style={s.hint}>CuidaTuAuto</Text>
                <Text style={[s.hint, { fontSize: 10 }]}>
                  Cuidado con evidencia.
                </Text>
              </View>
            </View>
          </ScrollView>
          {!desktop && (
            <View style={x.bottomNav}>
              {nav.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  testID={`nav-${item.id}`}
                  accessibilityState={{ selected: tab === item.id }}
                  onPress={() => go(item.id)}
                  style={x.bottomItem}
                >
                  <View
                    style={[
                      x.bottomIcon,
                      item.id === tab && { backgroundColor: C.tealLight },
                    ]}
                  >
                    <Icon
                      name={item.icon}
                      size={21}
                      color={item.id === tab ? C.teal : C.muted}
                    />
                  </View>
                  <Text
                    style={[
                      x.bottomLabel,
                      item.id === tab && { color: C.teal, fontWeight: "700" },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
      {connection}
      {vehicleOpen && (
        <VehicleSheet
          api={api}
          vehicle={editingVehicle}
          onClose={() => setVehicleOpen(false)}
          onSaved={reload}
        />
      )}
      {newOpen && (
        <NewCustodySheet
          api={api}
          vehicles={vehicles}
          demoMode={!!health?.demoMode}
          onClose={() => setNewOpen(false)}
          onCreated={onCreated}
        />
      )}
      {acceptOpen && (
        <AcceptSheet
          api={api}
          onClose={() => setAcceptOpen(false)}
          onAccepted={onCreated}
        />
      )}
    </SafeAreaView>
  );
}
const x = StyleSheet.create({
  app: { flex: 1, flexDirection: "row" },
  sidebar: {
    width: 244,
    padding: 23,
    backgroundColor: C.white,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  main: { flex: 1, minWidth: 0 },
  topbar: {
    height: 78,
    paddingHorizontal: 35,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.white,
  },
  content: { padding: 34, paddingBottom: 20 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 13,
    paddingVertical: 14,
    borderRadius: 11,
  },
  navActive: { backgroundColor: C.tealLight },
  navLabel: { fontSize: 13, color: C.muted, flex: 1 },
  navCount: {
    borderRadius: 5,
    backgroundColor: "#CAE6DA",
    minWidth: 21,
    alignItems: "center",
    paddingVertical: 3,
  },
  navCountText: { fontSize: 10, fontWeight: "700", color: C.teal },
  sidebarNote: {
    padding: 15,
    backgroundColor: "#F1F7EF",
    borderRadius: 15,
    marginBottom: 18,
    gap: 8,
  },
  sidebarNoteTitle: { fontSize: 13, fontWeight: "700", color: C.ink },
  avatar: {
    height: 34,
    width: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDEBE3",
  },
  avatarText: { color: C.teal, fontWeight: "700", fontSize: 14 },
  userName: { color: C.ink, fontWeight: "600", fontSize: 11 },
  avatarLarge: {
    height: 67,
    width: 67,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.tealLight,
  },
  avatarLargeText: { fontSize: 22, fontWeight: "700", color: C.teal },
  demoPill: {
    backgroundColor: C.tealLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  demoText: { fontSize: 10, color: C.teal, fontWeight: "600" },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.white,
    paddingTop: 7,
    paddingBottom: 8,
  },
  bottomItem: { flex: 1, alignItems: "center", gap: 4 },
  bottomIcon: { paddingVertical: 5, paddingHorizontal: 17, borderRadius: 16 },
  bottomLabel: { color: C.muted, fontSize: 9 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 20,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
});
