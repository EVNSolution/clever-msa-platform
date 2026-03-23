import { useEffect, useState, type FormEvent } from 'react';

import { createAssignment, listAssignments, updateAssignment } from '../api/assignments';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { DriverVehicleAssignment } from '../types';

type VehicleAssignmentsPageProps = {
  client: HttpClient;
};

type AssignmentFormState = {
  driver_id: string;
  vehicle_id: string;
  operator_company_id: string;
};

function createEmptyAssignmentForm(): AssignmentFormState {
  return {
    driver_id: '',
    vehicle_id: '',
    operator_company_id: '',
  };
}

function createTimestamp() {
  return new Date().toISOString();
}

export function VehicleAssignmentsPage({ client }: VehicleAssignmentsPageProps) {
  const [assignments, setAssignments] = useState<DriverVehicleAssignment[]>([]);
  const [form, setForm] = useState<AssignmentFormState>(createEmptyAssignmentForm());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshAssignments() {
    const response = await listAssignments(client);
    setAssignments(response);
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await listAssignments(client);
        if (!ignore) {
          setAssignments(response);
        }
      } catch (error) {
        if (!ignore) {
          setAssignments([]);
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [client]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createAssignment(client, {
        driver_id: form.driver_id.trim(),
        vehicle_id: form.vehicle_id.trim(),
        operator_company_id: form.operator_company_id.trim(),
        assignment_status: 'assigned',
        assigned_at: createTimestamp(),
        unassigned_at: null,
      });
      await refreshAssignments();
      setForm(createEmptyAssignmentForm());
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleUnassign(driverVehicleAssignmentId: string) {
    setErrorMessage(null);
    try {
      await updateAssignment(client, driverVehicleAssignmentId, {
        assignment_status: 'unassigned',
      });
      await refreshAssignments();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="data-grid two-columns wide-left">
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Driver Assignment Admin</p>
          <h2>Create assignment</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Driver ID</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, driver_id: event.target.value }))}
              value={form.driver_id}
            />
          </label>
          <label className="field">
            <span>Vehicle ID</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, vehicle_id: event.target.value }))}
              value={form.vehicle_id}
            />
          </label>
          <label className="field">
            <span>Operator Company ID</span>
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, operator_company_id: event.target.value }))
              }
              value={form.operator_company_id}
            />
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              Create assignment
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Assignment Registry</p>
          <h2>Assignment registry</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">Loading assignments...</p>
        ) : errorMessage ? null : assignments.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Operator Company</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.driver_vehicle_assignment_id}>
                  <td><code>{assignment.driver_id}</code></td>
                  <td><code>{assignment.vehicle_id}</code></td>
                  <td><code>{assignment.operator_company_id}</code></td>
                  <td>{assignment.assignment_status}</td>
                  <td>
                    {assignment.assignment_status === 'assigned' ? (
                      <button
                        className="button ghost small"
                        onClick={() => void handleUnassign(assignment.driver_vehicle_assignment_id)}
                        type="button"
                      >
                        Unassign
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">No assignments yet.</p>
        )}
      </section>
    </div>
  );
}
