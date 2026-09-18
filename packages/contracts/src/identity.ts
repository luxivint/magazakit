export type CurrentUserResponse = {
  uid: string;
  email: string | null;
  organization: OrganizationSummary | null;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  ownerUid: string;
};

export type DeviceRegistration = {
  uid: string;
  stored: true;
};
