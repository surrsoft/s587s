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
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconDatabase,
  IconEdit,
  IconMoon,
  IconPlus,
  IconRefresh,
  IconSend,
  IconSun,
  IconTrash,
  IconX,
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

type AccountRecord = {
  id: string;
  name: string;
  createdTime?: string;
};

export default function Home() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [fieldName, setFieldName] = useState("Name");
  const [fieldValue, setFieldValue] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingAccountName, setEditingAccountName] = useState("");

  const isConfigured = health?.airtable.configured === true;
  const isDark = computedColorScheme === "dark";

  const statusColor = useMemo(() => {
    if (!health) return "gray";
    return isConfigured ? "teal" : "yellow";
  }, [health, isConfigured]);

  const refreshAccounts = useCallback(async () => {
    setAccountsLoading(true);

    try {
      const response = await fetch("/api/airtable/accounts", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось прочитать счета");
      }

      setAccounts(payload.accounts ?? []);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Ошибка списка счетов",
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setAccountsLoading(false);
    }
  }, []);

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
        await refreshAccounts();
      } else {
        setRecords([]);
        setAccounts([]);
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
  }, [refreshAccounts]);

  async function createAccount() {
    const name = newAccountName.trim();

    if (!name) {
      notifications.show({
        color: "yellow",
        title: "Введите название",
        message: "Поле name не может быть пустым.",
      });
      return;
    }

    setAccountsLoading(true);

    try {
      const response = await fetch("/api/airtable/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось создать счёт");
      }

      setNewAccountName("");
      notifications.show({
        color: "teal",
        title: "Счёт создан",
        message: payload.account.name,
      });
      await refreshAccounts();
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Ошибка создания счёта",
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setAccountsLoading(false);
    }
  }

  function startEditAccount(account: AccountRecord) {
    setEditingAccountId(account.id);
    setEditingAccountName(account.name);
  }

  function cancelEditAccount() {
    setEditingAccountId(null);
    setEditingAccountName("");
  }

  async function updateAccount(accountId: string) {
    const name = editingAccountName.trim();

    if (!name) {
      notifications.show({
        color: "yellow",
        title: "Введите название",
        message: "Поле name не может быть пустым.",
      });
      return;
    }

    setAccountsLoading(true);

    try {
      const response = await fetch(`/api/airtable/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось обновить счёт");
      }

      cancelEditAccount();
      notifications.show({
        color: "teal",
        title: "Счёт обновлён",
        message: payload.account.name,
      });
      await refreshAccounts();
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Ошибка обновления счёта",
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setAccountsLoading(false);
    }
  }

  async function deleteAccount(account: AccountRecord) {
    const confirmed = window.confirm(`Удалить счёт "${account.name}"?`);

    if (!confirmed) return;

    setAccountsLoading(true);

    try {
      const response = await fetch(`/api/airtable/accounts/${account.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось удалить счёт");
      }

      notifications.show({
        color: "teal",
        title: "Счёт удалён",
        message: account.name,
      });
      await refreshAccounts();
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Ошибка удаления счёта",
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setAccountsLoading(false);
    }
  }

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
                <Text fw={600}>Счета</Text>
                <Title order={2}>{accounts.length}</Title>
                <Text size="sm" c="dimmed">
                  CRUD по полю name в таблице категорий.
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
            <>
              <Paper withBorder radius="md" p="lg">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4}>
                      <Title order={2}>Счета</Title>
                      <Text size="sm" c="dimmed">
                        Полный CRUD для поля <Code>name</Code> таблицы “доход расход категории”.
                      </Text>
                    </Stack>
                    <Badge variant="light" color="teal">
                      accounts
                    </Badge>
                  </Group>

                  <Group align="flex-end">
                    <TextInput
                      label="Новый счёт"
                      placeholder="name"
                      value={newAccountName}
                      onChange={(event) => setNewAccountName(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") createAccount();
                      }}
                      style={{ flex: 1 }}
                    />
                    <Button
                      leftSection={<IconPlus size={18} />}
                      loading={accountsLoading}
                      onClick={createAccount}
                    >
                      Добавить
                    </Button>
                  </Group>

                  <ScrollArea>
                    <Table verticalSpacing="sm" highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>name</Table.Th>
                          <Table.Th>ID</Table.Th>
                          <Table.Th ta="right">Действия</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {accounts.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={3}>
                              <Text c="dimmed">Счетов пока нет.</Text>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          accounts.map((account) => {
                            const isEditing = editingAccountId === account.id;

                            return (
                              <Table.Tr key={account.id}>
                                <Table.Td miw={280}>
                                  {isEditing ? (
                                    <TextInput
                                      aria-label={`Название счёта ${account.id}`}
                                      value={editingAccountName}
                                      onChange={(event) =>
                                        setEditingAccountName(event.currentTarget.value)
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") updateAccount(account.id);
                                        if (event.key === "Escape") cancelEditAccount();
                                      }}
                                    />
                                  ) : (
                                    <Text fw={500}>{account.name || "Без названия"}</Text>
                                  )}
                                </Table.Td>
                                <Table.Td>
                                  <Code>{account.id}</Code>
                                </Table.Td>
                                <Table.Td>
                                  <Group justify="flex-end" gap="xs" wrap="nowrap">
                                    {isEditing ? (
                                      <>
                                        <Tooltip label="Сохранить">
                                          <ActionIcon
                                            aria-label={`Сохранить счёт ${account.name}`}
                                            color="teal"
                                            variant="light"
                                            loading={accountsLoading}
                                            onClick={() => updateAccount(account.id)}
                                          >
                                            <IconCheck size={16} />
                                          </ActionIcon>
                                        </Tooltip>
                                        <Tooltip label="Отменить">
                                          <ActionIcon
                                            aria-label={`Отменить редактирование ${account.name}`}
                                            color="gray"
                                            variant="light"
                                            onClick={cancelEditAccount}
                                          >
                                            <IconX size={16} />
                                          </ActionIcon>
                                        </Tooltip>
                                      </>
                                    ) : (
                                      <>
                                        <Tooltip label="Редактировать">
                                          <ActionIcon
                                            aria-label={`Редактировать счёт ${account.name}`}
                                            variant="light"
                                            onClick={() => startEditAccount(account)}
                                          >
                                            <IconEdit size={16} />
                                          </ActionIcon>
                                        </Tooltip>
                                        <Tooltip label="Удалить">
                                          <ActionIcon
                                            aria-label={`Удалить счёт ${account.name}`}
                                            color="red"
                                            variant="light"
                                            loading={accountsLoading}
                                            onClick={() => deleteAccount(account)}
                                          >
                                            <IconTrash size={16} />
                                          </ActionIcon>
                                        </Tooltip>
                                      </>
                                    )}
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })
                        )}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Stack>
              </Paper>

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
            </>
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
