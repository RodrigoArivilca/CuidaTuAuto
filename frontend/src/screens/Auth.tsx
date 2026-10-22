import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Api, normalizeApiUrl } from "../lib/api";
import { errorMessage } from "../lib/format";
import type { Health, Role, Session } from "../types";
import {
  Button,
  C,
  Chip,
  Divider,
  Field,
  Icon,
  Logo,
  Notice,
  Sheet,
  s,
} from "../components/ui";

export function AuthScreen({
  api,
  onSession,
  onConnection,
  notice,
}: {
  api: Api;
  onSession: (session: Session) => Promise<void>;
  onConnection: () => void;
  notice?: string;
}) {
  const wide = useWindowDimensions().width >= 930;
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("owner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setError("");
    if (!email.trim() || !password || (register && !name.trim())) {
      setError("Completa los campos para continuar.");
      return;
    }
    if (register && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setBusy(true);
    try {
      const session = await api.post<Session>(
        register ? "/auth/register" : "/auth/login",
        {
          email: email.trim().toLowerCase(),
          password,
          ...(register ? { name: name.trim(), role } : {}),
        },
        true,
      );
      await onSession(session);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function demo(demoRole: Role) {
    setRegister(false);
    setEmail(
      demoRole === "owner" ? "propietario@demo.com" : "cuidador@demo.com",
    );
    setPassword("Demo2026!");
    setError("");
  }
  return (
    <ScrollView
      contentContainerStyle={[a.page, wide && { flexDirection: "row" }]}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          a.hero,
          wide ? { width: "46%", minHeight: 760 } : { padding: 26 },
        ]}
      >
        <Logo light />
        <View
          style={{
            gap: 22,
            flex: 1,
            justifyContent: "center",
            paddingVertical: wide ? 40 : 27,
          }}
        >
          <View style={a.heroPill}>
            <View style={[s.dot, { backgroundColor: C.lime }]} />
            <Text style={a.heroPillText}>CUIDADO QUE PUEDES VER</Text>
          </View>
          <Text style={[a.heroTitle, !wide && { fontSize: 34, maxWidth: 480 }]}>
            Tu auto cuidado.{wide ? "\n" : " "}Tú, tranquilo.
          </Text>
          <Text style={a.heroText}>
            Cada entrega, cada ronda y cada evidencia. Todo el cuidado de tu
            vehículo, en un solo lugar.
          </Text>
          {wide && (
            <View style={a.carScene}>
              <View style={a.sceneRing}>
                <Icon name="car-sport" size={116} color={C.lime} />
              </View>
              <View style={a.sceneBadge}>
                <Icon name="shield-checkmark" color={C.teal} size={22} />
                <View>
                  <Text style={a.sceneTitle}>
                    Un registro de principio a fin
                  </Text>
                  <Text style={s.hint}>Custodia · Evidencias · Historial</Text>
                </View>
              </View>
            </View>
          )}
        </View>
        {wide && (
          <View style={a.heroFooter}>
            <Icon name="checkmark-done" size={20} color={C.lime} />
            <Text style={a.heroFootText}>
              Propietarios y cuidadores, mejor conectados.
            </Text>
          </View>
        )}
      </View>
      <View style={a.formArea}>
        <View style={a.form}>
          <View style={s.headingRow}>
            <Text style={s.eyebrow}>BIENVENIDO A CUIDATUAUTO</Text>
            <Pressable
              onPress={onConnection}
              accessibilityLabel="Configurar conexión"
              testID="connection-open"
              style={{ padding: 8 }}
            >
              <Icon name="options-outline" color={C.muted} />
            </Pressable>
          </View>
          <View style={{ gap: 9 }}>
            <Text style={[s.h1, { fontSize: 31 }]}>
              {register ? "Crea tu cuenta" : "Qué bueno verte"}
            </Text>
            <Text style={s.subtitle}>
              {register
                ? "Elige tu rol y empieza a organizar tus custodias."
                : "Ingresa para continuar con el cuidado de tu vehículo."}
            </Text>
          </View>
          {!!notice && <Notice text={notice} />}
          {!!error && <Notice text={error} kind="error" />}
          {register && (
            <>
              <Field
                label="Nombre completo"
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre y apellido"
                maxLength={100}
                testID="register-name"
              />
              <View style={{ gap: 8 }}>
                <Text style={s.fieldLabel}>Usaré la aplicación como</Text>
                <View style={s.wrap}>
                  <Chip
                    label="Propietario"
                    icon="car-outline"
                    selected={role === "owner"}
                    onPress={() => setRole("owner")}
                  />
                  <Chip
                    label="Cuidador"
                    icon="shield-checkmark-outline"
                    selected={role === "caretaker"}
                    onPress={() => setRole("caretaker")}
                  />
                </View>
              </View>
            </>
          )}
          <Field
            label="Correo electrónico"
            placeholder="tu@correo.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            maxLength={254}
            testID="login-email"
          />
          <Field
            label="Contraseña"
            placeholder={
              register ? "Mínimo 8 caracteres" : "Escribe tu contraseña"
            }
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            onSubmitEditing={submit}
            maxLength={72}
            testID="login-password"
          />
          <Button
            onPress={submit}
            busy={busy}
            icon="arrow-forward"
            testID="login-submit"
          >
            {register ? "Crear mi cuenta" : "Ingresar a mi cuenta"}
          </Button>
          <View
            style={[
              s.row,
              { justifyContent: "center", flexWrap: "wrap", gap: 4 },
            ]}
          >
            <Text style={s.subtitle}>
              {register ? "¿Ya tienes una cuenta?" : "¿Primera vez aquí?"}
            </Text>
            <Pressable
              onPress={() => {
                setRegister(!register);
                setError("");
              }}
              accessibilityRole="button"
            >
              <Text style={a.link}>
                {register ? "Inicia sesión" : "Crea tu cuenta"}
              </Text>
            </Pressable>
          </View>
          <Divider />
          <View style={{ gap: 12 }}>
            <Text style={[s.hint, { textAlign: "center" }]}>
              ¿Vas a explorar el prototipo? Usa una cuenta de prueba.
            </Text>
            <View
              style={[s.row, { justifyContent: "center", flexWrap: "wrap" }]}
            >
              <Button
                variant="secondary"
                icon="car-outline"
                onPress={() => demo("owner")}
                testID="demo-owner"
              >
                Propietario demo
              </Button>
              <Button
                variant="secondary"
                icon="shield-checkmark-outline"
                onPress={() => demo("caretaker")}
                testID="demo-caretaker"
              >
                Cuidador demo
              </Button>
            </View>
          </View>
          <Text style={[s.hint, { textAlign: "center", marginTop: 8 }]}>
            Proyecto académico · Primera versión
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

export function ConnectionSheet({
  currentUrl,
  onClose,
  onSave,
}: {
  currentUrl: string;
  onClose: () => void;
  onSave: (url: string) => Promise<void>;
}) {
  const [url, setUrl] = useState(currentUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  async function test(save = false) {
    setBusy(true);
    setError("");
    setHealth(null);
    try {
      const normalized = normalizeApiUrl(url);
      const result = await new Api(normalized).health();
      setHealth(result);
      if (save) await onSave(normalized);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title="Conexión del proyecto"
      subtitle="Configura dónde se está ejecutando tu backend."
      onClose={onClose}
    >
      <Field
        label="Dirección del backend"
        value={url}
        onChangeText={(v) => {
          setUrl(v);
          setHealth(null);
        }}
        autoCapitalize="none"
        placeholder="http://localhost:4000"
        testID="api-url"
      />
      <View style={s.wrap}>
        <Chip
          label="Web local"
          onPress={() => setUrl("http://localhost:4000")}
        />
        <Chip
          label="Emulador Android"
          onPress={() => setUrl("http://10.0.2.2:4000")}
        />
      </View>
      <Text style={s.subtitle}>
        En un celular físico, utiliza la dirección IP de tu computadora. Cambiar
        de backend cerrará la sesión actual.
      </Text>
      {!!error && <Notice text={error} kind="error" />}
      {health && (
        <Notice
          kind="success"
          text={`Conexión correcta · ${health.databaseMode === "pglite" ? "Base local del prototipo" : "PostgreSQL"}${health.demoMode ? " · Datos de prueba habilitados" : ""}`}
        />
      )}
      <View style={s.wrap}>
        <Button variant="secondary" busy={busy} onPress={() => test()}>
          Probar conexión
        </Button>
        <Button busy={busy} onPress={() => test(true)} testID="api-save">
          Guardar y conectar
        </Button>
      </View>
    </Sheet>
  );
}

const a = StyleSheet.create({
  page: { flexGrow: 1, minHeight: "100%", backgroundColor: C.white },
  hero: { backgroundColor: C.navy, padding: 48, overflow: "hidden" },
  heroPill: {
    borderWidth: 1,
    borderColor: "#52716D",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
  },
  heroPillText: {
    color: C.lime,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "600",
  },
  heroTitle: {
    color: C.white,
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -1.8,
    lineHeight: 56,
  },
  heroText: { color: "#B8CED0", fontSize: 15, lineHeight: 25, maxWidth: 400 },
  carScene: { height: 260, alignItems: "center", justifyContent: "center" },
  sceneRing: {
    borderWidth: 1,
    borderColor: "#315665",
    borderRadius: 120,
    width: 210,
    height: 210,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#173A48",
  },
  sceneBadge: {
    position: "absolute",
    bottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.white,
  },
  sceneTitle: {
    color: C.ink,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  heroFooter: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#305260",
    paddingTop: 22,
  },
  heroFootText: { color: "#B8CED0", fontSize: 11 },
  formArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  form: { width: "100%", maxWidth: 420, gap: 22 },
  link: { color: C.teal, fontSize: 14, fontWeight: "700", padding: 5 },
});
