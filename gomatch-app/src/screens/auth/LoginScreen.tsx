import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthStack";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
import { FONT_SIZES, BUTTON_RADIUS } from "../../constants/theme";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    if (!email.trim()) { setError("Veuillez entrer votre email."); return; }
    if (!password) { setError("Veuillez entrer votre mot de passe."); return; }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Email ou mot de passe incorrect.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoBadge}>
            <Ionicons name="tennisball" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>GoMatch</Text>
          <Text style={styles.logoSub}>Tennis & Padel en Suisse</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Connexion</Text>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form */}
        <Input
          placeholder="Email"
          value={email}
          onChangeText={(v) => { setEmail(v); setError(""); }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          placeholder="Mot de passe"
          value={password}
          onChangeText={(v) => { setPassword(v); setError(""); }}
          secureTextEntry
        />

        <Button
          title="Se connecter"
          onPress={handleLogin}
          loading={loading}
          style={{ marginTop: 8 }}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={styles.linkRow}
        >
          <Text style={styles.linkGray}>Pas encore de compte ? </Text>
          <Text style={styles.linkBlue}>S'inscrire</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },

  // Logo
  logoArea: { alignItems: "center", marginBottom: 40 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.NAVY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: {
    fontSize: 30,
    fontWeight: "800",
    color: Colors.NAVY,
    letterSpacing: -0.5,
  },
  logoSub: {
    fontSize: FONT_SIZES.body,
    color: Colors.TEXT_SECONDARY,
    marginTop: 4,
  },

  // Title
  title: {
    fontSize: FONT_SIZES.h1,
    fontWeight: "700",
    color: Colors.NAVY,
    marginBottom: 24,
  },

  // Error
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: { color: Colors.ERROR, fontSize: FONT_SIZES.body, textAlign: "center" },

  // Link
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  linkGray: { fontSize: FONT_SIZES.body, color: Colors.TEXT_SECONDARY },
  linkBlue: { fontSize: FONT_SIZES.body, fontWeight: "700", color: Colors.BLUE },
});
