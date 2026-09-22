"use client";

import { useState, type FormEvent } from "react";
import type { AddressDeleteResponse, AddressResponse, AddressView } from "@/types/account";

interface AddressFormState {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

const emptyForm: AddressFormState = {
  label: "",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  isDefault: false,
};

function toFormState(address: AddressView): AddressFormState {
  return {
    label: address.label ?? "",
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    isDefault: address.isDefault,
  };
}

function AddressField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
      />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function AddressBook({ addresses: initialAddresses }: { addresses: AddressView[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<AddressFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function startAdd() {
    setEditingId("new");
    setForm(emptyForm);
    setFieldErrors({});
    setFormError(null);
  }

  function startEdit(address: AddressView) {
    setEditingId(address.id);
    setForm(toFormState(address));
    setFieldErrors({});
    setFormError(null);
  }

  function updateField<K extends keyof AddressFormState>(key: K, value: AddressFormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const payload = {
      ...form,
      label: form.label.trim() || undefined,
      line2: form.line2.trim() || undefined,
    };

    try {
      const response = await fetch(
        editingId === "new" ? "/api/account/addresses" : `/api/account/addresses/${editingId}`,
        {
          method: editingId === "new" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = (await response.json()) as AddressResponse;

      if (!data.success) {
        setFormError(data.message);
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      setAddresses((previous) => {
        const cleared = data.address.isDefault
          ? previous.map((item) => ({ ...item, isDefault: false }))
          : previous;
        const exists = cleared.some((item) => item.id === data.address.id);
        return exists
          ? cleared.map((item) => (item.id === data.address.id ? data.address : item))
          : [...cleared, data.address];
      });
      setEditingId(null);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this address?")) {
      return;
    }
    try {
      const response = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      const data = (await response.json()) as AddressDeleteResponse;
      if (!data.success) {
        window.alert(data.message);
        return;
      }
      setAddresses((previous) => previous.filter((item) => item.id !== id));
    } catch {
      window.alert("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {addresses.length === 0 ? (
        <p className="text-sm text-foreground/60">You haven&apos;t saved any addresses yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-black/5 p-4 dark:border-white/10"
            >
              <div className="flex flex-col gap-0.5 text-sm text-foreground/70">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{address.label || "Address"}</span>
                  {address.isDefault ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
                      Default
                    </span>
                  ) : null}
                </div>
                <span>{address.fullName}</span>
                <span>
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                </span>
                <span>
                  {address.city}, {address.state} {address.postalCode}
                </span>
                <span>{address.phone}</span>
              </div>
              <div className="flex shrink-0 gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(address)}
                  className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(address.id)}
                  className="text-xs font-medium text-foreground/50 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingId ? (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-3 rounded-2xl border border-black/5 p-5 dark:border-white/10"
        >
          <h3 className="text-sm font-semibold text-foreground">
            {editingId === "new" ? "Add address" : "Edit address"}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AddressField
              label="Label (e.g. Home)"
              value={form.label}
              onChange={(value) => updateField("label", value)}
            />
            <AddressField
              label="Full name"
              value={form.fullName}
              onChange={(value) => updateField("fullName", value)}
              error={fieldErrors.fullName}
            />
          </div>
          <AddressField
            label="Phone"
            value={form.phone}
            onChange={(value) => updateField("phone", value)}
            error={fieldErrors.phone}
          />
          <AddressField
            label="Address"
            value={form.line1}
            onChange={(value) => updateField("line1", value)}
            error={fieldErrors.line1}
          />
          <AddressField
            label="Apartment, suite, etc. (optional)"
            value={form.line2}
            onChange={(value) => updateField("line2", value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AddressField
              label="City"
              value={form.city}
              onChange={(value) => updateField("city", value)}
              error={fieldErrors.city}
            />
            <AddressField
              label="State"
              value={form.state}
              onChange={(value) => updateField("state", value)}
              error={fieldErrors.state}
            />
            <AddressField
              label="Postal code"
              value={form.postalCode}
              onChange={(value) => updateField("postalCode", value)}
              error={fieldErrors.postalCode}
            />
          </div>
          <label className="flex w-fit items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => updateField("isDefault", event.target.checked)}
              className="accent-rose-600"
            />
            Set as default address
          </label>

          {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-fit rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-rose-500 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save address"}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={startAdd}
          className="w-fit text-sm font-medium text-rose-600 hover:underline dark:text-rose-400"
        >
          + Add address
        </button>
      )}
    </div>
  );
}
