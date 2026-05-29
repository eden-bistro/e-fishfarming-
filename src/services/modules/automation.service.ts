import {
  listEnterpriseAlerts,
  type EnterpriseAlertSeverity,
} from "@/services/modules/alerts.service";

export type NotificationChannel = "push" | "email" | "sms";

export type AutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  minSeverity: EnterpriseAlertSeverity;
  triggerTypes: string[];
  channels: NotificationChannel[];
};

export type NotificationEvent = {
  id: string;
  ruleId: string;
  alertId: string;
  channel: NotificationChannel;
  message: string;
  createdAt: string;
};

const severityRank: Record<EnterpriseAlertSeverity, number> = {
  info: 1,
  warning: 2,
  critical: 3,
};

export function listAutomationRules(): AutomationRule[] {
  return [
    {
      id: "rule-critical-all",
      name: "Critical alerts broadcast",
      enabled: true,
      minSeverity: "critical",
      triggerTypes: ["*"],
      channels: ["push", "email", "sms"],
    },
    {
      id: "rule-operations-warning",
      name: "Ops warnings to push/email",
      enabled: true,
      minSeverity: "warning",
      triggerTypes: ["low_feed_stock", "mortality_event"],
      channels: ["push", "email"],
    },
  ];
}

export function evaluateNotificationEvents(alerts = listEnterpriseAlerts()): NotificationEvent[] {
  const rules = listAutomationRules().filter((rule) => rule.enabled);

  return alerts.flatMap((alert) =>
    rules
      .filter((rule) => severityRank[alert.severity] >= severityRank[rule.minSeverity])
      .filter((rule) => rule.triggerTypes.includes("*") || rule.triggerTypes.includes(alert.type))
      .flatMap((rule) =>
        rule.channels.map((channel) => ({
          id: `${rule.id}-${alert.id}-${channel}`,
          ruleId: rule.id,
          alertId: alert.id,
          channel,
          message: `[${alert.severity.toUpperCase()}] ${alert.message}`,
          createdAt: alert.createdAt,
        })),
      ),
  );
}
