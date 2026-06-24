import { AspiranteLayoutClient } from "./AspiranteLayoutClient";

export default function AspiranteLayout({ children }: { children: React.ReactNode }) {
  return <AspiranteLayoutClient>{children}</AspiranteLayoutClient>;
}