/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const api = {
  async checkHealth() {
    const response = await fetch("/api/health");
    return response.json();
  },

  async connectMT5(login: string, server: string) {
    const response = await fetch("/api/mt5/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ login, server }),
    });
    return response.json();
  },
};
