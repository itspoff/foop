import { getProfileModal } from "../modals/profileModal.js";

export default {
  prefix: "profile_",
  async execute(interaction, { user, value }) {
    const buttonOwnerId = value;

    const modal = getProfileModal({
      user,
      buttonOwnerId,
    });

    await interaction.showModal(modal);
  },
};
