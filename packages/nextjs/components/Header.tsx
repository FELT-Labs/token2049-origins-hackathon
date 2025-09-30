"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BugAntIcon } from "@heroicons/react/24/outline";
import { ConnectButton } from "~~/components/scaffold-alchemy";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Debug Contracts",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-apple-bg-hover shadow-apple-sm" : ""
              } hover:bg-apple-bg-hover hover:shadow-apple-sm hover:-translate-y-0.5 focus:bg-apple-bg-hover active:text-apple-text-primary py-2 px-4 text-sm font-medium rounded-apple-md gap-2 flex items-center transition-all duration-300 ease-apple text-apple-text-primary`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  return (
    <div className="flex items-center justify-between bg-apple-bg-secondary backdrop-blur-apple min-h-0 flex-shrink-0 z-20 shadow-apple-sm px-8 py-4 mx-8 mt-6 rounded-apple-xl border border-apple-border">
      <div className="flex items-center w-1/2">
        <Link href="/" passHref className="flex items-center gap-3 ml-4 mr-6 shrink-0">
          <div className="flex flex-col">
            <span className="text-xl font-semibold leading-tight text-apple-text-primary tracking-apple-tight">💰 YieldVault</span>
            <span className="text-xs text-apple-text-secondary">Investment Platform</span>
          </div>
        </Link>
        <ul className="flex flex-nowrap items-center px-1 gap-3">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="flex items-center mr-0">
        <ConnectButton />
      </div>
    </div>
  );
};
