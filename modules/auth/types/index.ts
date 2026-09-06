export type LoginInput = {
  identifier: string;
  password: string;
};

export type LoginResult = {
  success: boolean;
  message?: string;
};
