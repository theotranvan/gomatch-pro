import axios from "axios";

export function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return !error.response && (error.code === "ERR_NETWORK" || error.message === "Network Error");
  }
  if (error instanceof TypeError && error.message === "Network request failed") {
    return true;
  }
  return false;
}
