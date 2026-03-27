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
import { FONT_SIZES } from "../../constants/theme";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "L'email est requis.";
    else if (!EMAIL_REGEX.test(email.trim())) e.email = "Format d'email invalide.";
    if (!password) e.password = "Le mot de passe est requis.";
    else if (password.length < 8) e.password = "8 caractères minimum.";
    if (!passwordConfirm) e.passwordConfirm = "Veuillez confirmer le mot de passe.";
    else if (password !== passwordConfirm) e.passwordConfirm = "Les mots de passe ne correspondent pas.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    setGlobalError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, passwordConfirm);
      navigation.navigate("Onboarding");
    } catch (err: any) {
      const data = err.response?.data;
      const msg =
        data?.email?.[0] ||
        data?.password?.[0] ||
        data?.password_confirm?.[0] ||
        data?.detail ||
        "Erreur lors de l'inscription.";
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  }

  function clearField(field: string) {
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setGlobalError("");
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
        </View>

        {/* Title */}
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Rejoins la communauté GoMatch</Text>

        {/* Error */}
        {globalError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{globalError}</Text>
          </View>
        ) : null}

        {/* Form */}
        <Input
          placeholder="Email"
          value={email}
          onChangeText={(v) => { setEmail(v); clearField("email"); }}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />
        <Input
          placeholder="Mot de passe"
          value={password}
          onChangeText={(v) => { setPassword(v); clearField("password"); }}
          secureTextEntry
          error={errors.password}
          hint="8 caractères minimum"
        />
        <Input
          placeholder="Confirmer le mot de passe"
          value={passwordConfirm}
          onChangeText={(v) => { setPasswordConfirm(v); clearField("passwordConfirm"); }}
          secureTextEntry
          error={errors.passwordConfirm}
        />

        <Button
          title="Créer mon compte"
          onPress={handleRegister}
          loading={loading}
          style={{ marginTop: 8 }}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          style={styles.linkRow}
        >
          <Text style={styles.linkGray}>Déjà un compte ? </Text>
          <Text style={styles.linkBlue}>Se connecter</Text>
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
  logoArea: { alignItems: "center", marginBottom: 32 },
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

  // Title
  title: {
    fontSize: FONT_SIZES.h1,
    fontWeight: "700",
    color: Colors.NAVY,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FONT_SIZES.body,
    color: Colors.TEXT_SECONDARY,
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
