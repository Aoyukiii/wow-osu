import { scores_list_user_user_best_response } from "osu-api-extended/dist/types/v2/scores_list_user_best"
import { UsersDetailsResponse } from "osu-api-extended/dist/types/v2/users_details"

import { Modes_names } from "osu-api-extended"

export const modes = ['osu', 'taiko', 'fruits', 'mania'] as const

export interface PlayerStats {
  mode: Modes_names
  user_details: UsersDetailsResponse
  best_plays: (
    scores_list_user_user_best_response & {
      index: number,
      difficulty_rating_str: string,
      pp_str: string,
      weight_pp_str: string,
      accuracy_100_str: string
    })[]
}
