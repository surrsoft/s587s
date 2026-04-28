"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Code,
  Container,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconDatabase, IconMoon, IconRefresh, IconSend, IconSun } from "@tabler/icons-react";

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

export default function Home() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [fieldName, setFieldName] = useState("Name");
  const [fieldValue, setFieldValue] = useState("");

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

  async function createRecord() {
    if (!fieldName.trim() || !fieldValue.trim()) {
      notifications.show({
        color: "yellow",
        title: "Заполните поле",
        message: "Нужно указать название поля и значение.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/airtable/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { [fieldName.trim()]: fieldValue.trim() } }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось создать запись");
      }

      setFieldValue("");
      notifications.show({
        color: "teal",
        title: "Запись создана",
        message: payload.record.id,
      });
      await refresh();
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Ошибка записи",
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setLoading(false);
    }
  }

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
                <IconDatabase size={30} stroke={1.8} />
                <Title order={1}>s587s</Title>
              </Group>
              <Text c="dimmed" maw={640}>
                Тонкий клиент на Next.js и Mantine для чтения и записи данных в Airtable.
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

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
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

            <Paper withBorder radius="md" p="md">
              <Stack gap="xs">
                <Text fw={600}>Записи</Text>
                <Title order={2}>{records.length}</Title>
                <Text size="sm" c="dimmed">
                  Показываем последние 25 записей из таблицы.
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>

          {!isConfigured ? (
            <Paper withBorder radius="md" p="lg">
              <Stack gap="sm">
                <Title order={2}>Настройка окружения</Title>
                <Text c="dimmed">
                  Создайте <Code>.env.local</Code> и заполните значения из{" "}
                  <Code>.env.example</Code>.
                </Text>
                <Divider />
                <SimpleGrid cols={{ base: 1, sm: 3 }}>
                  <Badge color={health?.airtable.apiKey ? "teal" : "gray"} variant="light">
                    AIRTABLE_API_KEY
                  </Badge>
                  <Badge color={health?.airtable.baseId ? "teal" : "gray"} variant="light">
                    AIRTABLE_BASE_ID
                  </Badge>
                  <Badge color={health?.airtable.tableName ? "teal" : "gray"} variant="light">
                    AIRTABLE_TABLE_NAME
                  </Badge>
                </SimpleGrid>
              </Stack>
            </Paper>
          ) : (
            <Paper withBorder radius="md" p="lg">
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={2}>Новая запись</Title>
                  <Badge variant="light" color="teal">
                    server write
                  </Badge>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    label="Поле"
                    value={fieldName}
                    onChange={(event) => setFieldName(event.currentTarget.value)}
                  />
                  <TextInput
                    label="Значение"
                    value={fieldValue}
                    onChange={(event) => setFieldValue(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") createRecord();
                    }}
                  />
                </SimpleGrid>
                <Group justify="flex-end">
                  <Button
                    leftSection={<IconSend size={18} />}
                    loading={loading}
                    onClick={createRecord}
                  >
                    Создать
                  </Button>
                </Group>
              </Stack>
            </Paper>
          )}

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
