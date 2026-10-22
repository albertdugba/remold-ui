/**
 * The site: Remold's documentation, with the examples as docs pages, and the Pro page.
 * Addresses are hashes ("#/react/layout"); see docs/routes.tsx.
 */
import { useEffect, useState } from "react";
import "./docs/docs.css";
import { DocsLayout, ProLayout } from "./docs/Layout";
import { readRoute, type Route } from "./docs/routes";
import { SvgGradients } from "./features/Svg";
import { MotionProvider } from "./motion";
import { ProPage } from "./pro/ProPage";

function useRoute(): Route {
  const [route, setRoute] = useState(() => readRoute(window.location.hash));
  useEffect(() => {
    const update = () => setRoute(readRoute(window.location.hash));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}

function Site() {
  const route = useRoute();
  return (
    <>
      <SvgGradients />
      {route.pro ? (
        <ProLayout>
          <ProPage />
        </ProLayout>
      ) : (
        <DocsLayout page={route.page!} anchor={route.anchor} />
      )}
    </>
  );
}

export function App() {
  return (
    <MotionProvider>
      <Site />
    </MotionProvider>
  );
}
