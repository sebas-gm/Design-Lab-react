export function accountHome(user) {
  return user?.tipo_cuenta === "negocios" ? "/dashboard" : "/inicio";
}

export function isClientView(user, pathname) {
  if (user?.tipo_cuenta !== "negocios") return true;
  return ["/inicio", "/negocios", "/videos", "/promociones"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
