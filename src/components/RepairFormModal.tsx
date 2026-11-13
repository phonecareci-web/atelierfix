import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  CurrencyCode,
  PHONE_BRANDS,
  REPAIR_STATUS_ORDER,
  RepairFormInput,
  RepairPriority,
  RepairStatus,
  RepairTicket,
} from '../types/repair';
import { getCurrencyConfig } from '../lib/statusConfig';

interface RepairFormModalProps {
  isOpen: boolean;
  editingTicket: RepairTicket | null;
  currency: CurrencyCode;
  defaultTechnician?: string;
  onClose: () => void;
  onSubmit: (data: RepairFormInput, editingTicket: RepairTicket | null) => void;
}

const INITIAL_FORM: RepairFormInput = {
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  brand: 'Apple',
  model: '',
  imei: '',
  passcode: '',
  reportedIssue: '',
  technicianDiagnosis: '',
  status: 'Reçu',
  priority: 'Normale',
  technician: '',
  estimatedCost: 0,
  depositPaid: 0,
  dueDate: '',
  notes: '',
};

const inputCls =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500';

export const RepairFormModal: React.FC<RepairFormModalProps> = ({
  isOpen,
  editingTicket,
  currency,
  defaultTechnician = '',
  onClose,
  onSubmit,
}) => {
  const currencyCfg = getCurrencyConfig(currency);
  const inputStep =
    currencyCfg.decimals === 0
      ? '1'
      : currencyCfg.decimals === 3
      ? '0.001'
      : '0.01';
  const [form, setForm] = useState<RepairFormInput>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    if (editingTicket) {
      setForm({
        clientName: editingTicket.clientName,
        clientPhone: editingTicket.clientPhone,
        clientEmail: editingTicket.clientEmail,
        brand: editingTicket.brand || 'Apple',
        model: editingTicket.model,
        imei: editingTicket.imei,
        passcode: editingTicket.passcode,
        reportedIssue: editingTicket.reportedIssue,
        technicianDiagnosis: editingTicket.technicianDiagnosis,
        status: editingTicket.status,
        priority: editingTicket.priority,
        technician: editingTicket.technician,
        estimatedCost: editingTicket.estimatedCost,
        depositPaid: editingTicket.depositPaid,
        dueDate: editingTicket.dueDate,
        notes: editingTicket.notes,
      });
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setForm({
        ...INITIAL_FORM,
        technician: defaultTechnician,
        dueDate: `${yyyy}-${mm}-${dd}`,
      });
    }
  }, [isOpen, editingTicket, defaultTechnician]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim()) {
      setFormError('Le nom du client est obligatoire.');
      return;
    }
    if (!form.clientPhone.trim()) {
      setFormError('Le numéro de téléphone du client est obligatoire.');
      return;
    }
    if (!form.model.trim()) {
      setFormError("Le modèle de l'appareil est obligatoire.");
      return;
    }
    if (!form.reportedIssue.trim()) {
      setFormError('Veuillez décrire la panne signalée.');
      return;
    }
    setFormError(null);
    onSubmit(form, editingTicket);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px] dark:bg-slate-950/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="repair-form-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2
              id="repair-form-title"
              className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {editingTicket
                ? `Modifier le dossier ${editingTicket.id}`
                : 'Enregistrer un nouveau téléphone'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Les informations seront enregistrées dans votre base
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5">
          {formError && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
              {formError}
            </div>
          )}

          <div className="space-y-6">
            {/* Section 1: Client */}
            <section>
              <h3 className="border-b border-slate-100 pb-2 font-display text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                1. Coordonnées client
              </h3>
              <div className="mt-3.5 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.clientName}
                    onChange={(e) =>
                      setForm({ ...form, clientName: e.target.value })
                    }
                    placeholder="Ex. Camille Laurent"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.clientPhone}
                    onChange={(e) =>
                      setForm({ ...form, clientPhone: e.target.value })
                    }
                    placeholder="06 12 34 56 78"
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) =>
                      setForm({ ...form, clientEmail: e.target.value })
                    }
                    placeholder="client@exemple.fr"
                    className={inputCls}
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Appareil */}
            <section>
              <h3 className="border-b border-slate-100 pb-2 font-display text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                2. Appareil déposé
              </h3>
              <div className="mt-3.5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Marque *
                  </label>
                  <select
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className={inputCls}
                  >
                    {PHONE_BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Modèle *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder="Ex. iPhone 15 Pro"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    IMEI / N° Série
                  </label>
                  <input
                    type="text"
                    value={form.imei}
                    onChange={(e) => setForm({ ...form, imei: e.target.value })}
                    placeholder="354812..."
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Code verrou / PIN
                  </label>
                  <input
                    type="text"
                    value={form.passcode}
                    onChange={(e) =>
                      setForm({ ...form, passcode: e.target.value })
                    }
                    placeholder="Ex. 1234 ou Aucun"
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>
            </section>

            {/* Section 3: Panne, statut et tarification */}
            <section>
              <h3 className="border-b border-slate-100 pb-2 font-display text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-100">
                3. Panne, suivi et tarification
              </h3>
              <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Panne signalée par le client *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={form.reportedIssue}
                    onChange={(e) =>
                      setForm({ ...form, reportedIssue: e.target.value })
                    }
                    placeholder="Ex. Vitre cassée, tactile ne répond plus, batterie gonflée..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Diagnostic technicien / Pièces requises
                  </label>
                  <textarea
                    rows={2}
                    value={form.technicianDiagnosis}
                    onChange={(e) =>
                      setForm({ ...form, technicianDiagnosis: e.target.value })
                    }
                    placeholder="Ex. Remplacement bloc écran OLED origine + joint étanchéité"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Statut actuel
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as RepairStatus,
                      })
                    }
                    className={inputCls}
                  >
                    {REPAIR_STATUS_ORDER.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Priorité
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priority: e.target.value as RepairPriority,
                      })
                    }
                    className={inputCls}
                  >
                    <option value="Normale">Normale</option>
                    <option value="Urgente">Urgente</option>
                    <option value="Express 2h">Express 2h</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Technicien assigné
                  </label>
                  <input
                    type="text"
                    value={form.technician}
                    onChange={(e) =>
                      setForm({ ...form, technician: e.target.value })
                    }
                    placeholder="Nom du technicien"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Coût estimé ({currencyCfg.symbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={inputStep}
                    value={form.estimatedCost}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estimatedCost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Acompte versé ({currencyCfg.symbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={inputStep}
                    value={form.depositPaid}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        depositPaid: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Date de restitution prévue
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  État esthétique / Accessoires remis / Notes internes
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ex. Micro-rayures au dos, coque silicone laissée au client, carte SIM retirée"
                  className={inputCls}
                />
              </div>
            </section>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {editingTicket
                ? 'Mettre à jour la fiche'
                : 'Enregistrer le dépôt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
