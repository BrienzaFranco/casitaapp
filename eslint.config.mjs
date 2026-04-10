import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const configuracion = [
  js.configs.recommended,
  ...nextVitals,
  ...nextTypeScript,
  {
    ignores: [".next/**", "node_modules/**", "dist/**"],
  },
];

export default configuracion;
