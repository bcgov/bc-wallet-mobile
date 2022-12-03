import {
  State as BifoldState,
  mergeReducers,
  reducer as bifoldReducer,
  defaultState,
  ReducerAction,
} from 'aries-bifold'

export interface IASEnvironment {
  name: string
  iasAgentInviteUrl: string
  iasPortalUrl: string
}
interface Developer {
  environment: IASEnvironment
}

export interface BCState extends BifoldState {
  developer: Developer
}

enum DeveloperDispatchAction {
  UPDATE_ENVIRONMENT = 'developer/updateEnvironment',
}

export type BCDispatchAction = DeveloperDispatchAction

export const BCDispatchAction = {
  ...DeveloperDispatchAction,
}

export const iasEnvironments: Array<IASEnvironment> = [
  {
    name: 'Production',
    iasAgentInviteUrl:
      'https://idim-agent.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiZTZiY2EwNzQtYmNmNC00ZjQzLTgwMjYtNWNjZjhkN2M4OTQyIiwgImxhYmVsIjogIklESU0iLCAic2VydmljZUVuZHBvaW50IjogImh0dHBzOi8vaWRpbS1hZ2VudC5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIiwgImltYWdlVXJsIjogImh0dHBzOi8vaWQuZ292LmJjLmNhL3N0YXRpYy9Hb3YtMi4wL2ltYWdlcy9mYXZpY29uLmljbyIsICJyZWNpcGllbnRLZXlzIjogWyJHeXJxY2NQR1FtV3JxWGZ6cWtRTUF2VlBycmRWYUdwRkgxOHNOWkUzdUtGIl19',
    iasPortalUrl: 'https://id.gov.bc.ca/issuer/v1/dids',
  },
  {
    name: 'Development',
    iasAgentInviteUrl:
      'https://idim-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiZDQ3NWM3ZjQtMTRjMy00NzdkLWI2NTMtY2Y5MDM4NDJmNGJjIiwgInJlY2lwaWVudEtleXMiOiBbIjJlSHBRRm9uTUVobXpvYWVFbUFMS1dxZHF5UldZZkE2TFF5akpKdGdiMldUIl0sICJsYWJlbCI6ICJJRElNIChEZXYpIiwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tYWdlbnQtZGV2LmFwcHMuc2lsdmVyLmRldm9wcy5nb3YuYmMuY2EiLCAiaW1hZ2VVcmwiOiAiaHR0cHM6Ly9pZC5nb3YuYmMuY2Evc3RhdGljL0dvdi0yLjAvaW1hZ2VzL2Zhdmljb24uaWNvIn0=',
    iasPortalUrl: 'https://iddev.gov.bc.ca/issuer/v1/dids',
  },
  {
    name: 'Test',
    iasAgentInviteUrl:
      'https://idim-sit-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiNmNjMjJiNTYtZmQwYy00Yjc4LWE3ZTQtYzYwYzJlODBlMDM0IiwgInJlY2lwaWVudEtleXMiOiBbIkNoSmJDTTVZSlMxb3hTQU1WNU1vY1J5cE1tUVp0eFFqcG9KWEZpTHZnMUM5Il0sICJsYWJlbCI6ICJJRElNIChTSVQpIiwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tc2l0LWFnZW50LWRldi5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIiwgImltYWdlVXJsIjogImh0dHBzOi8vaWQuZ292LmJjLmNhL3N0YXRpYy9Hb3YtMi4wL2ltYWdlcy9mYXZpY29uLmljbyJ9',
    iasPortalUrl: 'https://idsit.gov.bc.ca/issuer/v1/dids',
  },
]

const developerState: Developer = {
  environment: iasEnvironments[0],
}

export const initialState: BCState = { ...defaultState, developer: developerState }

const bcReducer = (state: BCState, action: ReducerAction<BCDispatchAction>): BCState => {
  switch (action.type) {
    case DeveloperDispatchAction.UPDATE_ENVIRONMENT: {
      const environment: IASEnvironment = (action?.payload || []).pop()
      const developer = { ...state.developer, environment }
      return { ...state, developer }
    }
    default:
      return state
  }
}

// @ts-ignore
export const reducer = mergeReducers(bifoldReducer, bcReducer)
