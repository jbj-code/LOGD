// src/constants/icons.ts
// Curated list of Material Symbol names (snake_case) available as log icons.

/** Legacy / mistaken names → valid Material Symbols Rounded ligatures. */
export const ICON_ALIASES: Record<string, string> = {
  podcast: 'podcasts',
  vaccinations: 'vaccines',
};

export const resolveIconSymbol = (symbol: string): string => ICON_ALIASES[symbol] ?? symbol;

export const AVAILABLE_ICONS: string[] = [
  /* Mindfulness & wellness */
  'self_improvement',
  'spa',
  'psychology',
  'favorite',
  'thumb_up',
  'sentiment_satisfied',
  'health_and_safety',
  'healing',
  'medication',
  'pill',
  'biotech',
  'medical_services',
  'bloodtype',
  'vaccines',
  'dentistry',
  'face_retouching_natural',
  'accessibility_new',

  /* Fitness & movement */
  'fitness_center',
  'directions_run',
  'directions_walk',
  'directions_bike',
  'hiking',
  'sports_gymnastics',
  'sports_martial_arts',
  'sports_soccer',
  'sports_basketball',
  'sports_tennis',
  'sports_volleyball',
  'pool',
  'surfing',
  'skateboarding',
  'monitor_weight',

  /* Sleep & routine */
  'bedtime',
  'nights_stay',
  'wb_sunny',
  'alarm',
  'schedule',
  'timer',
  'hourglass_empty',

  /* Food & drink */
  'water_drop',
  'restaurant',
  'local_cafe',
  'breakfast_dining',
  'lunch_dining',
  'dinner_dining',
  'bakery_dining',
  'egg_alt',
  'no_meals',
  'no_food',
  'no_drinks',
  'smoke_free',
  'vape_free',

  /* Learning & creativity */
  'menu_book',
  'auto_stories',
  'book_2',
  'school',
  'language',
  'code',
  'lightbulb',
  'newspaper',
  'podcasts',
  'music_note',
  'piano',
  'brush',
  'palette',
  'draw',
  'photo_camera',
  'design_services',
  'mic',
  'forum',

  /* Work & productivity */
  'work',
  'edit_note',
  'task_alt',
  'checklist',
  'checklist_rtl',
  'event_note',
  'calendar_today',
  'inventory_2',
  'show_chart',
  'trending_up',

  /* Home & chores */
  'home',
  'handyman',
  'cleaning_services',
  'countertops',
  'local_laundry_service',
  'dry_cleaning',
  'delete_sweep',
  'recycling',
  'shopping_cart',
  'local_grocery_store',
  'yard',
  'grass',
  'potted_plant',
  'local_florist',
  'eco',

  /* Body care & grooming */
  'shower',
  'soap',
  'content_cut',
  'opacity',

  /* Money & goals */
  'savings',
  'account_balance',
  'wallet',
  'attach_money',
  'receipt_long',
  'star',
  'verified_user',
  'shield_moon',

  /* Social & community */
  'groups',
  'volunteer_activism',
  'pets',

  /* Screen time & commute */
  'smartphone',
  'laptop_mac',
  'tv_off',
  'do_not_disturb_on',
  'videogame_asset',
  'commute',
  'electric_bike',
  'electric_scooter',

  /* Outdoors & travel */
  'beach_access',
];
