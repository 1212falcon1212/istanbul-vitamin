export function addressLine(address: { neighborhood?: string; street?: string; address_line: string }) {
  return [address.neighborhood, address.street, address.address_line]
    .map(value => value?.trim()).filter(Boolean).join(" ");
}
