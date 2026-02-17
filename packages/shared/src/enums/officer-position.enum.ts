export enum OfficerPosition {
  PRESIDENT = 'PRESIDENT',
  VICE_PRESIDENT = 'VICE_PRESIDENT',
  SECRETARY = 'SECRETARY',
  TREASURER = 'TREASURER',
  SERGEANT_AT_ARMS = 'SERGEANT_AT_ARMS',
  NEWS_REPORTER = 'NEWS_REPORTER',
  RECREATION_LEADER = 'RECREATION_LEADER',
  HISTORIAN = 'HISTORIAN',
}

export const OFFICER_POSITION_LABELS: Record<OfficerPosition, string> = {
  [OfficerPosition.PRESIDENT]: 'President',
  [OfficerPosition.VICE_PRESIDENT]: 'Vice President',
  [OfficerPosition.SECRETARY]: 'Secretary',
  [OfficerPosition.TREASURER]: 'Treasurer',
  [OfficerPosition.SERGEANT_AT_ARMS]: 'Sergeant-at-Arms',
  [OfficerPosition.NEWS_REPORTER]: 'News Reporter',
  [OfficerPosition.RECREATION_LEADER]: 'Recreation/Song Leader',
  [OfficerPosition.HISTORIAN]: 'Historian',
};

export const OFFICER_POSITION_DESCRIPTIONS: Record<OfficerPosition, string> = {
  [OfficerPosition.PRESIDENT]: 'Presides over meetings, builds agendas, delegates tasks, and ensures order using parliamentary procedure.',
  [OfficerPosition.VICE_PRESIDENT]: 'Fills in for the president, coordinates committees, and introduces guests.',
  [OfficerPosition.SECRETARY]: 'Keeps accurate minutes of meetings, records attendance, and handles correspondence.',
  [OfficerPosition.TREASURER]: 'Manages club funds, keeps financial records, and reports on the budget.',
  [OfficerPosition.SERGEANT_AT_ARMS]: 'Maintains order and sets up the room.',
  [OfficerPosition.NEWS_REPORTER]: 'Writes articles about club activities for local media.',
  [OfficerPosition.RECREATION_LEADER]: 'Leads games, icebreakers, and songs.',
  [OfficerPosition.HISTORIAN]: 'Documents the club\'s year through photos and scrapbooks.',
};
