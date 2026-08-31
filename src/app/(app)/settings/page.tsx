"use client";

import { Archive, Download, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChangePasswordCard } from "@/components/domain/change-password-card";
import { TypeChip } from "@/components/domain/chips";
import { InvitePartnerCard } from "@/components/domain/invite-partner-card";
import { MoneyInput } from "@/components/domain/money-input";
import { MoneyText } from "@/components/domain/money-text";
import { PersonBadge } from "@/components/domain/person-badge";
import { LineItem, SectionCard } from "@/components/domain/section-card";
import { SwapLoginsCard } from "@/components/domain/swap-logins-card";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatShare } from "@/domain/money";
import { splitMethodLabel } from "@/domain/sentences";
import type { CategoryType, SplitMethod } from "@/domain/types";
import { downloadCsv, toCsv } from "@/lib/csv";
import { newId, useHousehold } from "@/store/household-store";

const METHODS: SplitMethod[] = ["fifty_fifty", "proportional", "custom"];

function SettingsContent() {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") === "categories" ? "categories" : "general");
  const { household, view, users, dispatch } = useHousehold();
  const s0 = household.settings;
  const [newCategory, setNewCategory] = useState("");
  const [newType, setNewType] = useState<CategoryType>("variable");

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of household.transactions) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + 1);
    for (const b of household.bills) if (!b.archived) m.set(b.categoryId, (m.get(b.categoryId) ?? 0) + 1);
    return m;
  }, [household.transactions, household.bills]);

  const exportTable = (name: string, rows: Array<Record<string, unknown>>) => {
    downloadCsv(`${name}.csv`, toCsv(rows));
    toast.success(`Exported ${name}.csv`);
  };

  return (
    <>
      <PageHeader title="Settings" description="Change things here once; every other page reads from here." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <SectionCard title="Names">
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="app-name">App name</Label>
                  <Input
                    id="app-name"
                    value={household.name}
                    onChange={(e) => dispatch({ type: "updateHouseholdName", name: e.target.value })}
                    placeholder="Finance Tracker"
                  />
                  <p className="text-[11.5px] text-ink-muted">
                    Shown in the sidebar and on invites. Call it whatever you like.
                  </p>
                </div>
                {users.map((u, i) => (
                  <div key={u.id} className="grid gap-1.5">
                    <Label htmlFor={`name-${u.id}`} className="flex items-center gap-1.5">
                      <PersonBadge owner={{ kind: "user", userId: u.id }} users={users} size="xs" /> Person {i + 1}
                    </Label>
                    <Input
                      id={`name-${u.id}`}
                      value={u.name}
                      onChange={(e) => dispatch({ type: "updateUserName", userId: u.id, name: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Joint costs split"
              description="Used for shares of joint bills, the variable budget and settle-up"
            >
              <RadioGroup
                value={s0.splitMethod}
                onValueChange={(v) => dispatch({ type: "updateSettings", patch: { splitMethod: v as SplitMethod } })}
                className="grid gap-2"
              >
                {METHODS.map((m) => (
                  <div key={m} className="flex items-center gap-2 text-[13px]">
                    <RadioGroupItem value={m} id={`split-`} /> <Label htmlFor={`split-`}>{splitMethodLabel(m)}</Label>
                  </div>
                ))}
              </RadioGroup>
              {s0.splitMethod === "custom" ? (
                <div className="mt-4 grid gap-2">
                  <Label>{users[0].name}'s share</Label>
                  <Slider
                    value={[Math.round(s0.customShareUser1 * 100)]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) =>
                      dispatch({ type: "updateSettings", patch: { customShareUser1: (v[0] ?? 50) / 100 } })
                    }
                  />
                </div>
              ) : null}
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-row-hover/60 p-3 text-[13px]">
                {view.persons.map((p) => {
                  const u = users.find((x) => x.id === p.userId);
                  return (
                    <div key={p.userId}>
                      <p className="text-ink-muted">{u?.name}'s effective share</p>
                      <p className="money text-[20px] text-navy">{formatShare(p.share)}</p>
                      <p className="text-[12px] text-ink-muted">
                        income <MoneyText pence={p.incomePence} style="whole" className="font-medium" />
                      </p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Lifetime ISA" description="Per person; check gov.uk yearly">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="lisa-rate">Government bonus %</Label>
                  <Input
                    id="lisa-rate"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(s0.lisaBonusRate * 100)}
                    onChange={(e) =>
                      dispatch({ type: "updateSettings", patch: { lisaBonusRate: Number(e.target.value) / 100 } })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="lisa-allowance">Annual allowance per person</Label>
                  <MoneyInput
                    id="lisa-allowance"
                    valuePence={s0.lisaAnnualAllowancePence}
                    onChange={(v) => dispatch({ type: "updateSettings", patch: { lisaAnnualAllowancePence: v ?? 0 } })}
                  />
                </div>
              </div>
              <LineItem
                className="mt-2"
                label="Max monthly contribution that earns bonus"
                value={<MoneyText pence={s0.lisaAnnualAllowancePence / 12} />}
              />
              <LineItem
                label="Max bonus per person per year"
                value={
                  <MoneyText pence={s0.lisaAnnualAllowancePence * s0.lisaBonusRate} style="whole" tone="positive" />
                }
              />
              <p className="mt-2 text-[12px] text-ink-muted">LISA property cap £450,000.</p>
            </SectionCard>

            <SectionCard title="House affordability" description="Rule of thumb only; lenders vary (typically 4-5×)">
              <div className="grid gap-1.5">
                <Label htmlFor="mortgage-multiple">Mortgage lending multiple (× joint annual income)</Label>
                <Input
                  id="mortgage-multiple"
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={s0.mortgageMultiple}
                  onChange={(e) =>
                    dispatch({ type: "updateSettings", patch: { mortgageMultiple: Number(e.target.value) } })
                  }
                  className="w-32"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {users.map((u, idx) => (
                  <div key={u.id} className="grid gap-1.5">
                    <Label htmlFor={`gross-${u.id}`}>{u.name}'s gross annual salary</Label>
                    <MoneyInput
                      id={`gross-${u.id}`}
                      valuePence={idx === 0 ? s0.grossAnnualIncomeUser1Pence : s0.grossAnnualIncomeUser2Pence}
                      onChange={(v) =>
                        dispatch({
                          type: "updateSettings",
                          patch:
                            idx === 0
                              ? { grossAnnualIncomeUser1Pence: v ?? 0 }
                              : { grossAnnualIncomeUser2Pence: v ?? 0 },
                        })
                      }
                      placeholder="Before tax"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-ink-muted">
                {view.affordability.usesGrossIncome
                  ? "Lenders multiply gross income; the mortgage estimate uses these."
                  : "Not set, so the estimate falls back to take-home × 12 (the workbook's approximation). Gross gives a truer figure."}
              </p>
              <LineItem
                className="mt-2"
                label="Rough mortgage"
                value={<MoneyText pence={view.affordability.mortgagePence} style="whole" />}
              />
            </SectionCard>

            <SectionCard
              title="Export data"
              description="CSV per table. Your data never leaves the database otherwise."
            >
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["transactions", household.transactions],
                    ["bills", household.bills],
                    [
                      "goals",
                      household.goals.map(({ pledges, ...g }) => ({
                        ...g,
                        pledges: pledges.map((p) => `${p.userId}:${p.monthlyPence}`).join("|"),
                      })),
                    ],
                    ["pot-snapshots", household.potSnapshots],
                    ["settlements", household.settlements],
                    ["accounts", household.accounts],
                    ["debts", household.debts],
                    ["investment-accounts", household.investmentAccounts],
                    ["investment-snapshots", household.investmentSnapshots],
                    ["categories", household.categories],
                  ] as Array<[string, Array<Record<string, unknown>>]>
                ).map(([name, rows]) => (
                  <Button key={name} variant="outline" size="sm" onClick={() => exportTable(name, rows)}>
                    <Download /> {name}
                  </Button>
                ))}
              </div>
            </SectionCard>

            <InvitePartnerCard />
            <SwapLoginsCard />
            <ChangePasswordCard />
          </div>
        </TabsContent>
        <TabsContent value="categories">
          <SectionCard
            title="Spending categories"
            description="Type drives the log and the budget grids. Renaming or retyping reclassifies past transactions too. Categories in use can be archived, not deleted."
            flush
          >
            <ul className="divide-y divide-hairline">
              {household.categories
                .filter((c) => !c.archived)
                .sort((a, b) => a.sort - b.sort)
                .map((c) => {
                  const inUse = usage.get(c.id) ?? 0;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-2 px-5 py-2 md:px-6">
                      <Input
                        aria-label="Category name"
                        value={c.name}
                        onChange={(e) => dispatch({ type: "updateCategory", category: { ...c, name: e.target.value } })}
                        className="h-8 w-48 min-w-0 flex-1 sm:flex-none"
                      />
                      <Select
                        value={c.type}
                        onValueChange={(v) =>
                          dispatch({ type: "updateCategory", category: { ...c, type: v as CategoryType } })
                        }
                      >
                        <SelectTrigger aria-label="Category type" className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="variable">Variable</SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      <TypeChip type={c.type} />
                      <span className="ml-auto text-[12px] text-ink-muted">
                        {inUse === 0 ? "Not in use" : `In use by ${inUse}`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          dispatch({ type: "archiveCategory", id: c.id });
                          toast("Category archived", {
                            description: `${c.name} is hidden from pickers; history is kept.`,
                          });
                        }}
                      >
                        <Archive /> Archive
                      </Button>
                    </li>
                  );
                })}
            </ul>
            <form
              className="flex flex-wrap items-center gap-2 border-t border-hairline px-5 py-3 md:px-6"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newCategory.trim();
                if (!name) return;
                if (household.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
                  toast.error("That category already exists", { description: "Categories are unique by name." });
                  return;
                }
                dispatch({
                  type: "addCategory",
                  category: {
                    id: newId("cat"),
                    name,
                    type: newType,
                    sort: household.categories.length + 1,
                    archived: false,
                  },
                });
                setNewCategory("");
                toast.success("Category added", { description: name });
              }}
            >
              <Input
                aria-label="New category name"
                placeholder="New category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="h-8 w-48"
              />
              <Select value={newType} onValueChange={(v) => setNewType(v as CategoryType)}>
                <SelectTrigger aria-label="New category type" className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" variant="outline">
                <Plus /> Add category
              </Button>
            </form>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
