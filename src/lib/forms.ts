"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Submit a form to a server action WITHOUT React's automatic form reset,
 * so people don't lose what they typed when the server returns an error.
 * Usage: <form action={formAction} onSubmit={keepValuesOnSubmit(formAction)}>
 * Keep `action` too: if someone submits before the page's JavaScript loads, the browser
 * then POSTs to the server action instead of putting the fields in the URL.
 */
export function keepValuesOnSubmit(formAction: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };
}
