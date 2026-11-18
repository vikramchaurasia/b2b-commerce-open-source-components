import { ACCESS_LEVEL_VIEW, ACCESS_LEVEL_EDIT, ACCESS_LEVEL_CHECKOUT } from './constants';
export const MOCK_COLLABORATORS = [{
  id: '005xx000001AAAA',
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  isExisting: true,
  accessLevel: ACCESS_LEVEL_EDIT
}, {
  id: '005xx000001BBBB',
  name: 'Robert Chen',
  email: 'robert.chen@example.com',
  isExisting: true,
  accessLevel: ACCESS_LEVEL_VIEW
}, {
  id: '005xx000001CCCC',
  name: 'Maria Garcia',
  email: 'maria.garcia@example.com',
  isExisting: true,
  accessLevel: ACCESS_LEVEL_CHECKOUT
}];
export const MOCK_SEARCH_RESULTS = [{
  id: '005xx000001DDDD',
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com'
}, {
  id: '005xx000001EEEE',
  name: 'Sarah Williams',
  email: 'sarah.williams@example.com'
}, {
  id: '005xx000001FFFF',
  name: 'David Lee',
  email: 'david.lee@example.com'
}, {
  id: '005xx000001GGGG',
  name: 'Emily Brown',
  email: 'emily.brown@example.com'
}, {
  id: '005xx000001HHHH',
  name: 'Michael Taylor',
  email: 'michael.taylor@example.com'
}, {
  id: '005xx000001JJJJ',
  email: 'nameless.user@example.com'
}];