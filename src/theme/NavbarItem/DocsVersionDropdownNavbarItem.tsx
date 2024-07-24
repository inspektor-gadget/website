import React from "react";
import DocsVersionDropdownNavbarItem from "@theme-original/NavbarItem/DocsVersionDropdownNavbarItem";
import type DocsVersionDropdownNavbarItemType from "@theme/NavbarItem/DocsVersionDropdownNavbarItem";
import type { WrapperProps } from "@docusaurus/types";
import useIsBrowser from "@docusaurus/useIsBrowser";

type Props = WrapperProps<typeof DocsVersionDropdownNavbarItemType>;

export default function DocsVersionDropdownNavbarItemWrapper(
  props: Props
): JSX.Element {
  const isBrowser = useIsBrowser();
  if (!isBrowser || !window.location.pathname.includes("/docs")) {
    return null;
  }

  return (
    <>
      <DocsVersionDropdownNavbarItem {...props} />
    </>
  );
}
