import { DisplayBoard } from "../components/DisplayBoard";

export default async function Page({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const kiosk = params?.kiosk === "1" || params?.kiosk === "true";

  return <DisplayBoard kiosk={kiosk} />;
}
