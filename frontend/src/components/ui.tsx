import React, { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { CustodyStatus } from "../types";
import { statusLabels } from "../lib/format";

export const C = {
  navy: "#102D39",
  navyLight: "#1A4350",
  teal: "#087F74",
  tealLight: "#E5F4EE",
  lime: "#D5F386",
  ink: "#16323D",
  muted: "#6C8088",
  border: "#DCE6E5",
  bg: "#F4F7F5",
  white: "#FFFFFF",
  amber: "#A56811",
  amberLight: "#FFF4DA",
  danger: "#B5473D",
  dangerLight: "#FFF0EC",
  blue: "#47739A",
};
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export const Icon = ({
  name,
  size = 22,
  color = C.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) => <Ionicons name={name} size={size} color={color} />;
export function Logo({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={s.row}>
      <View style={[s.logoMark, light && { backgroundColor: C.lime }]}>
        <Icon
          name="shield-checkmark"
          color={light ? C.navy : C.white}
          size={24}
        />
      </View>
      {!compact && (
        <View>
          <Text style={[s.logoText, light && { color: C.white }]}>
            CuidaTuAuto
          </Text>
          <Text style={[s.logoCaption, light && { color: "#9EB5BD" }]}>
            TRANQUILIDAD EN CADA PARADA
          </Text>
        </View>
      )}
    </View>
  );
}
export function Button({
  children,
  onPress,
  icon,
  variant = "primary",
  busy,
  disabled,
  testID,
  style,
}: {
  children: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
}) {
  const color =
    variant === "primary" ? C.white : variant === "danger" ? C.danger : C.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: !!disabled || !!busy, busy }}
      testID={testID}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        variant === "primary"
          ? s.buttonPrimary
          : variant === "secondary"
            ? s.buttonSecondary
            : variant === "danger"
              ? s.buttonDanger
              : s.buttonGhost,
        (disabled || busy) && { opacity: 0.5 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : icon ? (
        <Icon name={icon} size={18} color={color} />
      ) : null}
      <Text style={[s.buttonText, { color }]}>{children}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#91A0A7"
        selectionColor={C.teal}
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 96, textAlignVertical: "top" },
          props.style,
        ]}
      />
      {hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Heading({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={s.headingRow}>
      <View style={{ flex: 1, gap: 7 }}>
        <Text style={s.h1}>{title}</Text>
        {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}
export function Section({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={s.headingRow}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.h2}>{title}</Text>
        {subtitle && <Text style={s.hint}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}
export function StatusBadge({ status }: { status: CustodyStatus }) {
  const fg =
    status === "active"
      ? C.teal
      : ["pending", "awaiting_confirmation"].includes(status)
        ? C.amber
        : C.muted;
  const bg =
    status === "active"
      ? C.tealLight
      : ["pending", "awaiting_confirmation"].includes(status)
        ? C.amberLight
        : "#EDF1F2";
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <View style={[s.dot, { backgroundColor: fg }]} />
      <Text style={[s.badgeText, { color: fg }]}>{statusLabels[status]}</Text>
    </View>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{ selected: !!selected }}
      style={[s.chip, selected && s.chipSelected]}
    >
      {icon && (
        <Icon name={icon} size={17} color={selected ? C.teal : C.muted} />
      )}
      <Text style={[s.chipText, selected && { color: C.teal }]}>{label}</Text>
    </Pressable>
  );
}
export function Notice({
  text,
  kind = "info",
  onDismiss,
}: {
  text: string;
  kind?: "info" | "error" | "success";
  onDismiss?: () => void;
}) {
  const color =
    kind === "error" ? C.danger : kind === "success" ? C.teal : C.blue;
  return (
    <View
      style={[
        s.notice,
        {
          backgroundColor:
            kind === "error"
              ? C.dangerLight
              : kind === "success"
                ? C.tealLight
                : "#EAF1F7",
        },
      ]}
    >
      <Icon
        name={
          kind === "error"
            ? "alert-circle-outline"
            : kind === "success"
              ? "checkmark-circle-outline"
              : "information-circle-outline"
        }
        color={color}
        size={20}
      />
      <Text style={[s.noticeText, { color }]}>{text}</Text>
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          accessibilityLabel="Cerrar aviso"
          accessibilityRole="button"
        >
          <Icon name="close" color={color} size={20} />
        </Pressable>
      )}
    </View>
  );
}
export function Empty({
  title,
  text,
  icon = "file-tray-outline",
  action,
}: {
  title: string;
  text: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} color={C.teal} size={32} />
      </View>
      <Text style={s.h2}>{title}</Text>
      <Text style={[s.subtitle, { textAlign: "center", maxWidth: 390 }]}>
        {text}
      </Text>
      {action}
    </View>
  );
}
export function Loading({ text = "Cargando información…" }: { text?: string }) {
  return (
    <View style={s.empty}>
      <ActivityIndicator size="large" color={C.teal} />
      <Text style={s.subtitle}>{text}</Text>
    </View>
  );
}
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  width = 620,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  const window = useWindowDimensions();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View
          style={[
            s.modal,
            { maxWidth: width, maxHeight: window.height * 0.92 },
          ]}
        >
          <View style={s.modalHeader}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.h2}>{title}</Text>
              {subtitle && <Text style={s.hint}>{subtitle}</Text>}
            </View>
            <Pressable
              accessibilityLabel="Cerrar ventana"
              accessibilityRole="button"
              onPress={onClose}
              style={s.iconButton}
            >
              <Icon name="close" />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.modalBody}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export function Divider() {
  return <View style={s.divider} />;
}
export function Metric({
  label,
  value,
  icon,
  note,
}: {
  label: string;
  value: string | number;
  icon: IconName;
  note?: string;
}) {
  return (
    <Card style={{ flex: 1, minWidth: 145, gap: 18 }}>
      <View style={s.headingRow}>
        <Text style={s.hint}>{label}</Text>
        <Icon name={icon} color={C.teal} size={20} />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={s.metric}>{value}</Text>
        {note && <Text style={s.hint}>{note}</Text>}
      </View>
    </Card>
  );
}
export const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  stack: { gap: 18 },
  h1: { color: C.ink, fontSize: 29, fontWeight: "700", letterSpacing: -0.7 },
  h2: { color: C.ink, fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  h3: { color: C.ink, fontSize: 16, fontWeight: "600" },
  text: { color: C.ink, fontSize: 14, lineHeight: 22 },
  subtitle: { color: C.muted, fontSize: 14, lineHeight: 22 },
  hint: { color: C.muted, fontSize: 12, lineHeight: 18 },
  eyebrow: {
    color: C.teal,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.7,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 22,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  logoMark: {
    backgroundColor: C.teal,
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 21,
    color: C.ink,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  logoCaption: {
    fontSize: 6.3,
    color: C.muted,
    letterSpacing: 0.8,
    fontWeight: "600",
    marginTop: 4,
  },
  button: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 17,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: C.teal,
    borderWidth: 1,
    borderColor: C.teal,
  },
  buttonSecondary: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  buttonGhost: { backgroundColor: "transparent" },
  buttonDanger: {
    backgroundColor: C.dangerLight,
    borderWidth: 1,
    borderColor: "#F1D0C9",
  },
  buttonText: { fontSize: 13, fontWeight: "600" },
  fieldLabel: { fontSize: 13, color: C.ink, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#FBFCFB",
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: C.ink,
    fontSize: 14,
    minHeight: 47,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 30,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  dot: { width: 6, height: 6, borderRadius: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  chipSelected: { backgroundColor: C.tealLight, borderColor: "#A3CFC3" },
  chipText: { fontSize: 12, color: C.muted, fontWeight: "600" },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: 12,
    padding: 14,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 19 },
  empty: {
    paddingVertical: 44,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 14,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: C.tealLight,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#071F2AC9",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    width: "100%",
    backgroundColor: C.white,
    borderRadius: 23,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 22,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalBody: { padding: 22, gap: 18 },
  iconButton: { padding: 8, borderRadius: 30 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 3 },
  metric: {
    fontSize: 34,
    color: C.ink,
    fontWeight: "700",
    letterSpacing: -1.3,
  },
});
