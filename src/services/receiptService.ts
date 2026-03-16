
import { Order, CartItem, Category, ModifierOption } from '../types';
import { isInlineModifier, getModifierPriority, getModifierSuperGroup } from '../utils/modifierUtils';
import { DELIVERY_CHARGE } from '../constants';

export const generateReceiptContent = (order: Order, tillName: string): string => {
  const ESC = '\x1b';
  const GS = '\x1d';

  const ALIGN_CENTER = ESC + 'a' + '\x01';
  const ALIGN_LEFT = ESC + 'a' + '\x00';
  const ALIGN_RIGHT = ESC + 'a' + '\x02';

  const TXT_NORMAL = GS + '!' + '\x00';
  const TXT_QUAD = GS + '!' + '\x11';
  const TXT_LARGE = GS + '!' + '\x10';

  const FONT_A = ESC + 'M' + '\x00';
  const FONT_B = ESC + 'M' + '\x01';

  const TXT_BOLD_ON = ESC + 'E' + '\x01';
  const TXT_BOLD_OFF = ESC + 'E' + '\x00';

  const INVERSE_ON = GS + 'B' + '\x01';
  const INVERSE_OFF = GS + 'B' + '\x00';

  const MAX_WIDTH = 48;

  const line = (left: string, right: string = '') => {
    const space = MAX_WIDTH - left.length - right.length;
    if (space < 0) return left + ' ' + right + '\n';
    return left + ' '.repeat(space) + right + '\n';
  };

  const boldLeftNormalRight = (left: string, right: string = '') => {
    const space = MAX_WIDTH - left.length - right.length;
    if (space < 0) return TXT_BOLD_ON + left + TXT_BOLD_OFF + ' ' + right + '\n';
    return TXT_BOLD_ON + left + TXT_BOLD_OFF + ' '.repeat(space) + right + '\n';
  };

  const divider = '------------------------------------------------\n';

  let content = '';

  // Initialise
  content += ESC + '@';
  
  // Set default line height
  content += ESC + '2';

  // Drawer kick
  if (order.paymentMethod === 'Cash') {
    content += '\x1b\x70\x00\x19\xfa';
  }

  // Header
  content += ALIGN_LEFT;
  content += line(
    'Hungry Shark',
    `Time: ${order.date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })}`
  );

  // Divider above
  content += divider;

  // Order Number (clean & centred)
  content += '\n';
  content += ALIGN_CENTER;
  content += TXT_NORMAL;
  content += 'ORDER NUMBER:\n';

  content += TXT_QUAD;
  content += TXT_BOLD_ON;
  content += `B${order.id}\n`;
  content += TXT_BOLD_OFF;
  content += TXT_NORMAL;

  content += ALIGN_LEFT;
  content += '\n';

  // DELIVERY banner
  if (order.orderType === 'Delivery') {
    content += '\n';
    content += ALIGN_CENTER + TXT_LARGE + TXT_BOLD_ON + 'DELIVERY';
    content += TXT_BOLD_OFF + TXT_NORMAL + ALIGN_LEFT + '\n';
  }

  content += divider;

  // ===============================
  // CUSTOMER INFO
  // ===============================
  if (order.orderType === 'Delivery' && order.customer) {
    content += 'CUSTOMER INFO:\n';
    content += TXT_BOLD_ON + order.customer.phone + '\n';
    content += order.customer.address + '\n';
    content += order.customer.postcode + '\n';
    content += TXT_BOLD_OFF;
    content += divider;
  }

  // ===============================
  // SORT & GROUP ITEMS
  // ===============================
  const CATEGORY_PRIORITY = [
    Category.FISH,
    Category.BURGERS,
    Category.WRAPS,
    Category.KEBABS,
    Category.BITES,
    Category.KIDS_MEALS,
    Category.CHICKEN,
    Category.SIDES,
    Category.CHIPS,
    Category.SAUSAGES,
    Category.PIES,
    Category.DRINKS,
    Category.POTS
  ];

  const sortedItems = [...order.items].sort((a, b) => {
    const aIdx = CATEGORY_PRIORITY.indexOf(a.category);
    const bIdx = CATEGORY_PRIORITY.indexOf(b.category);
    return aIdx !== bIdx ? aIdx - bIdx : a.name.localeCompare(b.name);
  });

  const itemsByCategory: Record<string, CartItem[]> = {};
  sortedItems.forEach(item => {
    if (!itemsByCategory[item.category]) itemsByCategory[item.category] = [];
    itemsByCategory[item.category].push(item);
  });

  // ===============================
  // ITEMS
  // ===============================
  CATEGORY_PRIORITY.forEach(cat => {
    const items = itemsByCategory[cat];
    if (!items || items.length === 0) return;

    items.forEach((item, index) => {
        let displayName = item.name;
        let displayModifiers = [...item.modifiers];

        if (cat === Category.DRINKS) {
            if (displayModifiers.length > 0) {
                displayName = `(${displayModifiers[0].name})`;
                displayModifiers = displayModifiers.slice(1);
            } else {
                displayName = `(${displayName})`;
            }
        } else if (cat === Category.POTS) {
            if (displayName.toLowerCase().includes('sauce pot')) {
                const flavorIdx = displayModifiers.findIndex(m => !['Small', 'Large'].includes(m.name));
                if (flavorIdx !== -1) {
                    displayName = displayModifiers[flavorIdx].name;
                    displayModifiers.splice(flavorIdx, 1);
                }
            } else if (displayName.toLowerCase().includes('dip')) {
                const flavorIdx = displayModifiers.findIndex(m => !['Small', 'Large'].includes(m.name));
                if (flavorIdx !== -1) {
                    displayName = `Dips (${displayModifiers[flavorIdx].name})`;
                    displayModifiers.splice(flavorIdx, 1);
                }
            }
        }

        let unitPrice = item.manualPrice ?? item.price;
        if (item.manualPrice === undefined) {
            unitPrice += item.modifiers.reduce((a, m) => a + m.price, 0);
        }

        const sizeModifiers = displayModifiers.filter(m => isInlineModifier(m.groupId, item.name));
        const otherModifiers = displayModifiers.filter(m => !isInlineModifier(m.groupId, item.name));

        const sizeTxt = sizeModifiers.map(m => {
            const superGroup = getModifierSuperGroup(m.groupId);
            if (superGroup === 'add_chips' || superGroup === 'type') {
                return `(${m.name})`;
            }
            if (superGroup === 'size') {
                if (cat === Category.BURGERS) {
                    return `(${m.name})`;
                }
                return `- ${m.name}`;
            }
            return `(${m.name})`;
        }).join(' ');
        
        const leftText = sizeTxt ? `${item.quantity} x ${displayName} ${sizeTxt}` : `${item.quantity} x ${displayName}`;
        const priceText = (unitPrice * item.quantity).toFixed(2);
        const space = MAX_WIDTH - leftText.length - priceText.length;
        const padding = space > 0 ? ' '.repeat(space) : ' ';

        content += `${leftText}${padding}${priceText}\n`;

        // Sort modifiers
        otherModifiers.sort((a, b) => getModifierPriority(a.groupId) - getModifierPriority(b.groupId));

        const specialMods = otherModifiers.filter(m => 
            getModifierSuperGroup(m.groupId) === 'size' ||
            m.groupId === 'meal_drinks' ||
            m.groupId === 'kids_drink_select' ||
            m.groupId === 'side_add_chips' ||
            m.name.toLowerCase().includes('meal') || 
            m.name.toLowerCase().includes('on chips') ||
            m.name === 'Burger Only' ||
            m.name === 'Wrap Only'
        );
        const normalMods = otherModifiers.filter(m => !specialMods.includes(m));

        specialMods.forEach(m => {
            if (m.groupId === 'meal_drinks' || m.groupId === 'kids_drink_select') {
                content += `   + Meal - ${m.name}\n`;
            } else if (m.name === 'Meal' || m.name === 'Burger Only' || m.name === 'Wrap Only') {
                // Skip these, as we show the drink or it's implied
            } else {
                content += `   + ${m.name}\n`;
            }
        });

        // Group modifiers
        const groupedModifiers = new Map<string, ModifierOption[]>();
        normalMods.forEach(m => {
            const key = getModifierSuperGroup(m.groupId);
            if(!groupedModifiers.has(key)) groupedModifiers.set(key, []);
            groupedModifiers.get(key)?.push(m);
        });
        
        const modifierGroups = Array.from(groupedModifiers.values());

        modifierGroups.forEach(mods => {
            const modsText = `+ (${mods.map(m => m.name).join(', ')})`;
            const hasMealOrOnChips = specialMods.some(m => 
                m.groupId === 'meal_drinks' || 
                m.groupId === 'kids_drink_select' || 
                m.groupId === 'side_add_chips' ||
                m.name.toLowerCase().includes('on chips')
            );
            const indent = hasMealOrOnChips ? '      ' : '   ';
            content += `${indent}${modsText}\n`;
        });

        if (item.instructions) {
            content += `  Note: ${item.instructions}\n`;
        }
        content += '\n'; // Space after each item
    });
  });

  // ===============================
  // TOTAL
  // ===============================
  content += divider;
  content += line('TOTAL', order.total.toFixed(2));

  // Feed & cut (SUNMI / RawBT)
  content += '\n\n\n\n\n';
  // Try multiple cut commands to ensure compatibility
  content += '\x1d\x56\x42\x00'; // GS V B 0 (Partial cut)
  content += '\x1d\x56\x00'; // GS V 0 (Full cut)
  content += '\x1d\x56\x41\x00'; // GS V A 0 (Full cut)
  content += '\x1b\x6d'; // ESC m (Partial cut)
  content += '\x1b\x69'; // ESC i (Full cut)

  return content;
};
