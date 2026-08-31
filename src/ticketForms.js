const { TextInputStyle } = require('discord.js');

/**
 * One entry per Customer-ticket service key. Discord modals allow a max of
 * 5 text inputs, so each form is capped at 5 questions.
 *
 * Set up matching /ticket-type add entries with these exact keys so the
 * form triggers when an opener picks that option. Any ticket type key not
 * listed here skips straight to channel creation with no form.
 */
const TICKET_FORMS = {
  war_piloting: {
    modalTitle: 'War Piloting — Please fill the form out :)',
    fields: [
      { customId: 'marches_crystal', label: 'Marches to use and Crystal tech level', style: TextInputStyle.Paragraph, required: true },
      { customId: 'dead_troops', label: 'Dead troops?', style: TextInputStyle.Paragraph, required: true },
      { customId: 'playstyle', label: 'Playstyle?', style: TextInputStyle.Short, required: true },
      { customId: 'date_duration', label: 'Date & Duration of the service', style: TextInputStyle.Short, required: true },
      { customId: 'aware_price', label: 'Are you aware of the price?', style: TextInputStyle.Short, required: true },
    ],
  },

  farm_care: {
    modalTitle: 'Farm Piloting — Please fill the form out :)',
    fields: [
      { customId: 'farm_count', label: 'How many farms need servicing?', style: TextInputStyle.Short, required: true },
      { customId: 'special_farms', label: 'Any Melons/Clash Canyon farms? (+$1 each)', style: TextInputStyle.Short, required: true },
      { customId: 'gather_tier', label: 'Current gather troop tier & capacity', style: TextInputStyle.Paragraph, required: true },
      { customId: 'donation_focus', label: 'Preferred training/tech donation focus', style: TextInputStyle.Paragraph, required: false },
      { customId: 'aware_price', label: 'Aware of pricing ($4/farm/month)?', style: TextInputStyle.Short, required: true },
    ],
  },

  account_management: {
    modalTitle: 'Account Care — Please fill the form out :)',
    fields: [
      { customId: 'account_info', label: 'Kingdom, power & alliance', style: TextInputStyle.Short, required: true },
      { customId: 'priority_tasks', label: 'Which daily tasks/events to prioritize?', style: TextInputStyle.Paragraph, required: true },
      { customId: 'aoo_notes', label: 'Any AoO (Ark of Osiris) scheduling notes?', style: TextInputStyle.Paragraph, required: false },
      { customId: 'checkin_pref', label: 'Preferred check-in frequency', style: TextInputStyle.Short, required: true },
      { customId: 'aware_price', label: 'Aware of the $150/month rate?', style: TextInputStyle.Short, required: true },
    ],
  },

  baulur_pilot: {
    modalTitle: 'Baulur Camp Service — Fill this out :)',
    fields: [
      { customId: 'account_count', label: 'How many accounts for Baulur Camp?', style: TextInputStyle.Short, required: true },
      { customId: 'march_speed', label: 'March speed on each account', style: TextInputStyle.Short, required: true },
      { customId: 'booking_period', label: 'Preferred booking period/duration', style: TextInputStyle.Short, required: true },
      { customId: 'camp_conditions', label: 'Any camp conditions we should know?', style: TextInputStyle.Paragraph, required: false },
      { customId: 'aware_price', label: 'Aware of pricing ($60/$50/$40 per month)?', style: TextInputStyle.Short, required: true },
    ],
  },

  barb_chaining: {
    modalTitle: 'KVK Chaining — Please fill the form out :)',
    fields: [
      { customId: 'march_count', label: 'Chaining marches available (min 3)', style: TextInputStyle.Short, required: true },
      { customId: 'ap_available', label: 'AP available for chaining', style: TextInputStyle.Short, required: true },
      { customId: 'barb_locations', label: 'Barb locations / kingdom', style: TextInputStyle.Short, required: true },
      { customId: 'scheduled_hours', label: 'Preferred scheduled hours', style: TextInputStyle.Short, required: false },
      { customId: 'aware_price', label: 'Aware of pricing ($2/1K Honor)?', style: TextInputStyle.Short, required: true },
    ],
  },
};

module.exports = { TICKET_FORMS };
