import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useApp } from "../lib/state";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: user ? "/dashboard" : "/login" });
  }, [user, navigate]);
  return <div className="min-h-screen bg-background" />;
}
