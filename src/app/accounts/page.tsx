"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Code,
  Container,
  Group,
  Paper,
  ScrollArea,
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
  IconArrowLeft,
  IconCheck,
  IconEdit,
  IconMoon,
  IconPlus,
  IconRefresh,
  IconSun,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

type AccountRecord = {
  id: string;
  name: string;
  createdTime?: string;
};

export default function AccountsPage() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingAccountName, setEditingAccountName] = useState("");

  const isDark = computedColorScheme === "dark";

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshAccounts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshAccounts]);

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
                <Title order={1}>Счета</Title>
              </Group>
              <Text c="dimmed" maw={720}>
                Полный CRUD для поля <Code>name</Code> таблицы “доход расход категории”.
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
                loading={accountsLoading}
                onClick={refreshAccounts}
              >
                Обновить
              </Button>
            </Group>
          </Group>

          <Paper withBorder radius="md" p="lg">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Title order={2}>Редактор счетов</Title>
                  <Text size="sm" c="dimmed">
                    Сейчас загружено {accounts.length} записей.
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
                            <Table.Td miw={320}>
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
        </Stack>
      </Container>
    </Box>
  );
}
