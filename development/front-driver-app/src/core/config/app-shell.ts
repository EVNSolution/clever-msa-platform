export const appShell = {
  appName: "clever-driver",
  tenantCode: "cheonha",
  productMode: "native-only",
  driverTabs: ["work-logs", "my"] as const,
} as const;

export type DriverTabKey = (typeof appShell.driverTabs)[number];
