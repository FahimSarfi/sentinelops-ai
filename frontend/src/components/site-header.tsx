"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Brand } from "./brand";
import { ButtonLink } from "./ui/button";
const links = [
  ["Product", "/#product"],
  ["How it works", "/#how-it-works"],
  ["Integrations", "/#integrations"],
  ["Documentation", "/docs"],
];
const landingLinks = [
  ["Product", "/#product"],
  ["Solutions", "/#how-it-works"],
  ["Resources", "/docs"],
  ["Pricing", "/docs#status"],
];
export function SiteHeader({ landing = false }: { landing?: boolean }) {
  const [open, setOpen] = useState(false);
  const navigation = landing ? landingLinks : links;
  return (
    <header className={`site-header wrap${landing ? " hero-site-header" : ""}`}>
      <Brand />
      <nav aria-label="Main navigation" className="desktop-nav">
        {navigation.map(([label, href]) => (
          <a key={label} href={href}>
            {label}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <ButtonLink href="/sign-in" variant="ghost">
          {landing ? "Log in" : "Sign in"}
        </ButtonLink>
        {landing && (
          <>
            <a className="hero-nav-extra" href="/#product">
              View demo
            </a>
          </>
        )}
        <ButtonLink href="/sign-up">
          {landing ? (
            "Get Started"
          ) : (
            <>
              Get started <ArrowUpRight size={15} />
            </>
          )}
        </ButtonLink>
      </div>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
          >
            <Menu />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className={`mobile-drawer${landing ? " hero-mobile-drawer" : ""}`}
          >
            <Dialog.Title>Explore SentinelOps</Dialog.Title>
            <Dialog.Description>From incident to insight.</Dialog.Description>
            <nav aria-label="Mobile navigation">
              {[
                ...navigation,
                [landing ? "Log in" : "Sign in", "/sign-in"],
                ...(landing ? [["View demo", "/#product"]] : []),
                [landing ? "Get Started" : "Get started", "/sign-up"],
              ].map(([label, href]) => (
                <a href={href} key={label} onClick={() => setOpen(false)}>
                  {label}
                  <ArrowUpRight size={17} />
                </a>
              ))}
            </nav>
            <Dialog.Close
              className="icon-button dialog-close"
              aria-label="Close navigation"
            >
              <X />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
