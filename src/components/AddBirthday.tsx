"use client";
// "Add your birthday" on your own profile, for members who skipped it at sign-up.
import { useActionState } from "react";
import BirthdateFields from "@/components/BirthdateFields";
import { keepValuesOnSubmit } from "@/lib/forms";
import { useT } from "@/lib/i18n/client";
import { addBirthdate, type BirthdayState } from "@/app/profile/birthday-actions";

export default function AddBirthday({ currentYear }: { currentYear: number }) {
  const t = useT();
  const [state, action, pending] = useActionState<BirthdayState, FormData>(addBirthdate, {});
  return (
    <form action={action} onSubmit={keepValuesOnSubmit(action)} className="card flex flex-col gap-3 p-4">
      <h2 className="font-semibold">{t("people.birthday.addTitle")}</h2>
      <p className="text-sm text-muted">{t("people.birthday.addBody")}</p>
      <BirthdateFields currentYear={currentYear} />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="btn btn-md btn-inverse self-start">{t("people.birthday.save")}</button>
      <p className="text-meta text-muted">{t("people.birthday.adultTip")}</p>
    </form>
  );
}
