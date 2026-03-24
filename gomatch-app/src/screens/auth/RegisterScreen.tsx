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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthStack";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
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

    if (!email.trim()) {
      e.email = "L'email est requis.";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      e.email = "Format d'email invalide.";
    }

    if (!password) {
      e.password = "Le mot de passe est requis.";
    } else if (password.length < 8) {
      e.password = "8 caractères minimum.";
    }

    if (!passwordConfirm) {
      e.passwordConfirm = "Veuillez confirmer le mot de passe.";
    } else if (password !== passwordConfirm) {
      e.passwordConfirm = "Les mots de passe ne correspondent pas.";
    }

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>
            Rejoins la communauté GoMatch
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {globalError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{globalError}</Text>
            </View>
          ) : null}

          <Input
            label="Email"
            placeholder="votre@email.com"
            value={email}
            onChangeText={(v) => { setEmail(v); clearField("email"); }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="Mot de passe"
            placeholder="Votre mot de passe"
            value={password}
            onChangeText={(v) => { setPassword(v); clearField("password"); }}
            secureTextEntry
            error={errors.password}
            hint="8 caractères minimum"
          />

          <Input
            label="Confirmer le mot de passe"
            placeholder="Retapez votre mot de passe"
            value={passwordConfirm}
            onChangeText={(v) => { setPasswordConfirm(v); clearField("passwordConfirm"); }}
            secureTextEntry
            error={errors.passwordConfirm}
          />

          <Button
            title="Créer mon compte"
            onPress={handleRegister}
            loading={loading}
            style={styles.button}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={styles.linkContainer}
          >
            <Text style={styles.linkText}>Déjà un compte ? </Text>
            <Text style={styles.linkBold}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.TEXT,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.TEXT_SECONDARY,
    marginTop: 6,
  },
  form: {
    width: "100%",
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  errorBoxText: {
    color: Colors.ERROR,
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  linkText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  linkBold: {
    fontSize: 14,
    color: Colors.PRIMARY,
    fontWeight: "700",
  },
});
