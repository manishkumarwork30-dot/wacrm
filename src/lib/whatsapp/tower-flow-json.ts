/**
 * WhatsApp Flows JSON definition for the Tower Application form.
 *
 * This defines a single-screen form that opens natively inside WhatsApp
 * (no external browser). The user fills all fields at once and taps
 * "Submit Application". The form data is sent back via the webhook as
 * an `nfm_reply` interactive message.
 *
 * WhatsApp Flows JSON spec:
 * https://developers.facebook.com/docs/whatsapp/flows/reference/flowjson
 */

/**
 * Indian states for the dropdown. Kept concise — the full list is in
 * india-data.ts but that module pulls in districts too, which we don't
 * need for the flow dropdown (WhatsApp Flows has a max JSON size limit).
 */
const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Chandigarh', 'Puducherry',
]

const OWNERSHIP_OPTIONS = [
  { id: 'self_owned', title: 'Self Owned (खुद की)' },
  { id: 'family_owned', title: 'Family Owned (पारिवारिक)' },
  { id: 'joint_property', title: 'Joint Property (संयुक्त)' },
  { id: 'leased', title: 'Leased (पट्टे पर)' },
  { id: 'rented', title: 'Rented (किराए की)' },
]

/**
 * Returns the WhatsApp Flow JSON for the tower application form.
 * This is uploaded to Meta when creating/updating the flow.
 */
export function getTowerApplicationFlowJSON() {
  return {
    version: '6.3',
    screens: [
      {
        id: 'TOWER_APPLICATION',
        title: '4G/5G Tower Application',
        data: {},
        terminal: true,
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Form',
              name: 'tower_form',
              children: [
                // Full Name
                {
                  type: 'TextInput',
                  name: 'name',
                  label: 'Full Name (पूरा नाम)',
                  required: true,
                  'input-type': 'text',
                  'helper-text': 'अपना पूरा नाम लिखें',
                },
                // Location / Village / City
                {
                  type: 'TextInput',
                  name: 'location',
                  label: 'Location (स्थान / गांव / शहर)',
                  required: true,
                  'input-type': 'text',
                  'helper-text': 'जमीन का स्थान लिखें',
                },
                // State dropdown
                {
                  type: 'Dropdown',
                  name: 'state',
                  label: 'State (राज्य)',
                  required: true,
                  'data-source': INDIA_STATES.map((s) => ({
                    id: s.toLowerCase().replace(/\s+/g, '_'),
                    title: s,
                  })),
                },
                // PIN Code
                {
                  type: 'TextInput',
                  name: 'pin_code',
                  label: 'PIN Code (पिन कोड)',
                  required: true,
                  'input-type': 'number',
                  'helper-text': '6 अंकों का पिन कोड',
                },
                // Land Size
                {
                  type: 'TextInput',
                  name: 'land_size',
                  label: 'Land Size (जमीन का साइज)',
                  required: true,
                  'input-type': 'text',
                  'helper-text': 'जैसे: 1500 sq ft, 1 बीघा, 20x50',
                },
                // Ownership dropdown
                {
                  type: 'Dropdown',
                  name: 'ownership',
                  label: 'Ownership (स्वामित्व)',
                  required: true,
                  'data-source': OWNERSHIP_OPTIONS,
                },
                // Submit button
                {
                  type: 'Footer',
                  label: 'Submit Application (आवेदन जमा करें)',
                  'on-click-action': {
                    name: 'complete',
                    payload: {
                      name: '${form.name}',
                      location: '${form.location}',
                      state: '${form.state}',
                      pin_code: '${form.pin_code}',
                      land_size: '${form.land_size}',
                      ownership: '${form.ownership}',
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  }
}

/**
 * Resolve the state dropdown ID back to the human-readable state name.
 * The dropdown returns the id (e.g. "uttar_pradesh"), we want "Uttar Pradesh".
 */
export function resolveStateName(stateId: string): string {
  const found = INDIA_STATES.find(
    (s) => s.toLowerCase().replace(/\s+/g, '_') === stateId,
  )
  return found || stateId
}

/**
 * Resolve the ownership dropdown ID back to a label.
 */
export function resolveOwnershipLabel(ownershipId: string): string {
  const found = OWNERSHIP_OPTIONS.find((o) => o.id === ownershipId)
  return found ? found.title : ownershipId
}
