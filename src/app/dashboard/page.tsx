"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Code,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconLayoutDashboard,
  IconMoon,
  IconRefresh,
  IconSun,
} from "@tabler/icons-react";

type HealthResponse = {
  ok: boolean;
  airtable: {
    configured: boolean;
    baseId: boolean;
    tableName: boolean;
    apiKey: boolean;
  };
};

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
};

export default function DashboardPage() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const isConfigured = health?.airtable.configured === true;
  const isDark = computedColorScheme === "dark";

  const statusColor = useMemo(() => {
    if (!health) return "gray";
    return isConfigured ? "teal" : "yellow";
  }, [health, isConfigured]);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const healthResponse = await fetch("/api/health", { cache: "no-store" });
      const nextHealth = (await healthResponse.json()) as HealthResponse;
      setHealth(nextHealth);

      if (nextHealth.airtable.configured) {
        const recordsResponse = await fetch("/api/airtable/records", {
          cache: "no-store",
        });
        const payload = await recordsResponse.json();

        if (!recordsResponse.ok) {
          throw new Error(payload.error ?? "Не удалось прочитать Airtable");
        }

        setRecords(payload.records ?? []);
      } else {
        setRecords([]);
      }
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Ошибка подключения",
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  return (
    <Box component="main" bg="var(--mantine-color-body)" py={{ base: 24, sm: 40 }}>
      <Container size="lg">
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Stack gap={6}>
              <Group gap="sm">
                <Button
                  component={Link}
                  href="/"
                  leftSection={<IconArrowLeft size={18} />}
                  variant="subtle"
                >
                  Назад
                </Button>
                <IconLayoutDashboard size={30} stroke={1.8} />
                <Title order={1}>Дашборд</Title>
              </Group>
              <Text c="dimmed" maw={720}>
                Статус подключения, API и последние записи из Airtable.
              </Text>
            </Stack>

            <Group gap="xs">
              <Tooltip label={isDark ? "Светлая тема" : "Тёмная тема"}>
                <ActionIcon
                  aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
                  size="lg"
                  variant="light"
                  color={isDark ? "yellow" : "blue"}
                  onClick={() => setColorScheme(isDark ? "light" : "dark")}
                >
                  {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
                </ActionIcon>
              </Tooltip>
              <Button
                leftSection={<IconRefresh size={18} />}
                variant="light"
                loading={loading}
                onClick={refresh}
              >
                Обновить
              </Button>
            </Group>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Paper withBorder radius="md" p="md">
              <Stack gap="xs">
                <Text fw={600}>Airtable</Text>
                <Badge color={statusColor} variant="light" w="fit-content">
                  {isConfigured ? "подключен" : "нужна настройка"}
                </Badge>
                <Text size="sm" c="dimmed">
                  Используются только серверные env-переменные.
                </Text>
              </Stack>
            </Paper>

            <Paper withBorder radius="md" p="md">
              <Stack gap="xs">
                <Text fw={600}>API</Text>
                <Code>/api/airtable/records</Code>
                <Text size="sm" c="dimmed">
                  GET читает записи, POST создает запись.
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>

          <Paper withBorder radius="md" p="lg">
            <Stack gap="md">
              <Title order={2}>Последние записи</Title>
              {records.length === 0 ? (
                <Text c="dimmed">Записей пока нет или Airtable еще не настроен.</Text>
              ) : (
                <Stack gap="sm">
                  {records.map((record) => (
                    <Paper key={record.id} withBorder radius="sm" p="sm">
                      <Group justify="space-between" align="flex-start">
                        <Stack gap={4}>
                          <Text fw={600}>{record.id}</Text>
                          <Text size="sm" c="dimmed">
                            {record.createdTime ?? "createdTime не передан"}
                          </Text>
                        </Stack>
                        <Code>{JSON.stringify(record.fields)}</Code>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
