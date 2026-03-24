import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "../constants/colors";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  hint?: string;
  style?: ViewStyle;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "sentences",
  error,
  hint,
  style,
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
        placeholder={placeholder}
        placeholderTextColor="#A0A0A0"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.TEXT,
    backgroundColor: "#FAFAFA",
  },
  inputFocused: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "#FFFFFF",
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: Colors.ERROR,
    backgroundColor: "#FEF2F2",
  },
  error: {
    fontSize: 13,
    color: Colors.ERROR,
    marginTop: 6,
  },
  hint: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    marginTop: 6,
  },
});
