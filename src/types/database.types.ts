export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string
          first_name: string
          last_name: string
          date_of_birth: string
          gender: string
          phone_number: string | null
          email: string | null
          address: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['patients']['Insert']>
      }
      identity_records: {
        Row: {
          id: string
          patient_id: string
          identity_type: string
          identity_value: string
          is_primary: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['identity_records']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['identity_records']['Insert']>
      }
      encounters: {
        Row: {
          id: string
          patient_id: string
          appointment_id: string | null
          provider_id: string | null
          encounter_type: string
          status: string
          start_time: string | null
          end_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['encounters']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['encounters']['Insert']>
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          provider_id: string | null
          department: string | null
          appointment_time: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>
      }
      clinical_records: {
        Row: {
          id: string
          encounter_id: string | null
          patient_id: string | null
          provider_id: string | null
          status: string
          parent_record_id: string | null
          chief_complaint: string | null
          history_of_present_illness: string | null
          examination_notes: string | null
          created_at: string
          updated_at: string
          finalized_at: string | null
          finalized_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['clinical_records']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['clinical_records']['Insert']>
      }
      vitals: {
        Row: {
          id: string
          clinical_record_id: string | null
          height_cm: number | null
          weight_kg: number | null
          systolic_bp: number | null
          diastolic_bp: number | null
          heart_rate: number | null
          temperature_c: number | null
          spo2_percent: number | null
          recorded_at: string
          recorded_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['vitals']['Row'], 'id' | 'recorded_at'>
        Update: Partial<Database['public']['Tables']['vitals']['Insert']>
      }
      diagnoses: {
        Row: {
          id: string
          clinical_record_id: string | null
          condition_name: string
          code: string | null
          code_system: string | null
          certainty: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['diagnoses']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['diagnoses']['Insert']>
      }
      medication_prescriptions: {
        Row: {
          id: string
          clinical_record_id: string | null
          medication_name: string
          dosage: string
          frequency: string
          route: string | null
          duration_days: number | null
          instructions: string | null
          status: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['medication_prescriptions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['medication_prescriptions']['Insert']>
      }
      wards: {
        Row: {
          id: string
          name: string
          type: string | null
          capacity: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['wards']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['wards']['Insert']>
      }
      beds: {
        Row: {
          id: string
          ward_id: string | null
          bed_number: string
          status: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['beds']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['beds']['Insert']>
      }
      admissions: {
        Row: {
          id: string
          encounter_id: string | null
          patient_id: string | null
          attending_provider_id: string | null
          admission_reason: string
          expected_discharge_date: string | null
          actual_discharge_date: string | null
          discharge_summary_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['admissions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['admissions']['Insert']>
      }
      bed_allocations: {
        Row: {
          id: string
          admission_id: string | null
          bed_id: string | null
          start_time: string
          end_time: string | null
          status: string
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['bed_allocations']['Row'], 'id' | 'start_time' | 'created_at'>
        Update: Partial<Database['public']['Tables']['bed_allocations']['Insert']>
      }
      daily_progress_notes: {
        Row: {
          id: string
          admission_id: string | null
          provider_id: string | null
          subjective: string | null
          objective: string | null
          assessment: string | null
          plan: string | null
          status: string
          created_at: string
          finalized_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['daily_progress_notes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['daily_progress_notes']['Insert']>
      }
      nursing_records: {
        Row: {
          id: string
          admission_id: string | null
          nurse_id: string | null
          shift: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['nursing_records']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['nursing_records']['Insert']>
      }
      investigation_orders: {
        Row: {
          id: string
          clinical_record_id: string | null
          encounter_id: string | null
          patient_id: string | null
          ordered_by: string | null
          department: string
          test_name: string
          priority: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['investigation_orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['investigation_orders']['Insert']>
      }
      investigation_results: {
        Row: {
          id: string
          order_id: string | null
          parameter_name: string
          result_value: string
          unit: string | null
          reference_range: string | null
          is_abnormal: boolean | null
          remarks: string | null
          verified_by: string | null
          verified_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['investigation_results']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['investigation_results']['Insert']>
      }
      inventory_items: {
        Row: {
          id: string
          item_name: string
          sku: string | null
          category: string | null
          quantity_in_stock: number
          unit_price: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['inventory_items']['Insert']>
      }
      dispense_records: {
        Row: {
          id: string
          prescription_id: string | null
          patient_id: string | null
          inventory_item_id: string | null
          quantity_dispensed: number
          dispensed_by: string | null
          dispensed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['dispense_records']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['dispense_records']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          encounter_id: string | null
          patient_id: string | null
          invoice_number: string
          total_amount: number
          discount_amount: number
          tax_amount: number
          net_amount: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string | null
          item_description: string
          category: string | null
          quantity: number
          unit_price: number
          total_price: number
          reference_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoice_line_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['invoice_line_items']['Insert']>
      }
      payments: {
        Row: {
          id: string
          invoice_id: string | null
          patient_id: string | null
          receipt_number: string
          amount_paid: number
          payment_method: string
          payment_date: string | null
          collected_by: string | null
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      pmjay_cases: {
        Row: {
          id: string
          encounter_id: string | null
          patient_id: string | null
          urn: string
          package_code: string | null
          preauth_status: string | null
          claim_status: string | null
          claim_amount: number | null
          approved_amount: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['pmjay_cases']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['pmjay_cases']['Insert']>
      }
      insurance_providers: {
        Row: {
          id: string
          name: string
          contact_info: string | null
          is_active: boolean | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['insurance_providers']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['insurance_providers']['Insert']>
      }
      insurance_claims: {
        Row: {
          id: string
          encounter_id: string | null
          patient_id: string | null
          provider_id: string | null
          policy_number: string
          member_id: string | null
          preauth_status: string | null
          claim_status: string | null
          claim_amount: number | null
          approved_amount: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['insurance_claims']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['insurance_claims']['Insert']>
      }
      abdm_consents: {
        Row: {
          id: string
          patient_id: string | null
          consent_id: string
          purpose_of_request: string
          status: string
          hi_types: string[] | null
          date_range_from: string | null
          date_range_to: string | null
          data_erase_at: string | null
          granted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['abdm_consents']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['abdm_consents']['Insert']>
      }
      ai_interactions: {
        Row: {
          id: string
          clinical_record_id: string | null
          provider_id: string | null
          interaction_type: string
          prompt_context: Json
          ai_response: Json
          status: string
          created_at: string
          resolved_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['ai_interactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['ai_interactions']['Insert']>
      }
    }
  }
}
