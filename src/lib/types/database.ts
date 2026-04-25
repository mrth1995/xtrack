/**
 * Supabase database types for xtrack Phase 1.
 *
 * These types mirror the schema in supabase/migrations/2026042501_phase1_foundation.sql.
 * Regenerate with: `supabase gen types typescript --linked > src/lib/types/database.ts`
 * after the schema is applied to the linked project.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					email: string | null;
					display_name: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					email?: string | null;
					display_name?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					email?: string | null;
					display_name?: string | null;
					updated_at?: string;
				};
			};
			households: {
				Row: {
					id: string;
					name: string;
					created_by: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					created_by: string;
					created_at?: string;
				};
				Update: {
					name?: string;
				};
			};
			household_members: {
				Row: {
					id: string;
					household_id: string;
					user_id: string;
					role: 'owner' | 'member';
					joined_at: string;
				};
				Insert: {
					id?: string;
					household_id: string;
					user_id: string;
					role?: 'owner' | 'member';
					joined_at?: string;
				};
				Update: {
					role?: 'owner' | 'member';
				};
			};
			household_invites: {
				Row: {
					id: string;
					household_id: string;
					code: string;
					created_by: string;
					expires_at: string;
					used_at: string | null;
					used_by: string | null;
					revoked_at: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					household_id: string;
					code: string;
					created_by: string;
					expires_at: string;
					used_at?: string | null;
					used_by?: string | null;
					revoked_at?: string | null;
					created_at?: string;
				};
				Update: {
					used_at?: string | null;
					used_by?: string | null;
					revoked_at?: string | null;
				};
			};
			expenses: {
				Row: {
					id: string;
					household_id: string;
					created_by: string;
					amount: number;
					category: string;
					note: string | null;
					spent_at: string;
					client_id: string;
					is_deleted: boolean;
					created_at: string;
				};
				Insert: {
					id?: string;
					household_id: string;
					created_by: string;
					amount: number;
					category: string;
					note?: string | null;
					spent_at: string;
					client_id: string;
					is_deleted?: boolean;
					created_at?: string;
				};
				Update: {
					amount?: number;
					category?: string;
					note?: string | null;
					spent_at?: string;
					is_deleted?: boolean;
				};
			};
		};
		Views: Record<string, never>;
		Functions: {
			create_household_with_owner: {
				Args: { p_name: string };
				Returns: { id: string; name: string; created_by: string; created_at: string };
			};
			accept_household_invite: {
				Args: { p_code: string };
				Returns: { household_id: string; household_name: string };
			};
			create_household_invite: {
				Args: { p_household_id: string };
				Returns: {
					id: string;
					household_id: string;
					code: string;
					created_by: string;
					expires_at: string;
				};
			};
			current_household_id: {
				Args: Record<string, never>;
				Returns: string | null;
			};
		};
		Enums: Record<string, never>;
	};
}
