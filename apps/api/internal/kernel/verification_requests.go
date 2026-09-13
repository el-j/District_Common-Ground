package kernel

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type VerificationRequestStatus string

const (
	VerificationRequestPending  VerificationRequestStatus = "pending"
	VerificationRequestApproved VerificationRequestStatus = "approved"
	VerificationRequestRejected VerificationRequestStatus = "rejected"
)

type PluginVerificationRequest struct {
	ID              string         `json:"id"`
	PluginID        string         `json:"pluginId"`
	RequesterUserID string         `json:"requesterUserId"`
	SourceKind      string         `json:"sourceKind"`
	ManifestURL     *string        `json:"manifestUrl,omitempty"`
	BundleSHA256    string         `json:"bundleSha256"`
	Plugin          PluginMetadata `json:"pluginMetadata"`
	Status          string         `json:"status"`
	ReviewNotes     *string        `json:"reviewNotes,omitempty"`
	ReviewedBy      *string        `json:"reviewedBy,omitempty"`
	ReviewedAt      *time.Time     `json:"reviewedAt,omitempty"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
}

func (r *Repository) SubmitVerificationRequest(ctx context.Context, requesterUserID string, sourceKind string, manifestURL *string, bundleSHA256 string, plugin PluginMetadata) (PluginVerificationRequest, error) {
	id := uuid.NewString()
	pluginJSON, err := json.Marshal(plugin)
	if err != nil {
		return PluginVerificationRequest{}, fmt.Errorf("marshal plugin metadata: %w", err)
	}

	var stored PluginVerificationRequest
	err = r.db.QueryRow(ctx,
		`INSERT INTO plugin_verification_requests
			(id, plugin_id, requester_user_id, source_kind, manifest_url, bundle_sha256, plugin_metadata, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		 RETURNING id, plugin_id, requester_user_id, source_kind, manifest_url, bundle_sha256, plugin_metadata, status, review_notes, reviewed_by, reviewed_at, created_at, updated_at`,
		id, plugin.ID, requesterUserID, sourceKind, manifestURL, bundleSHA256, pluginJSON, string(VerificationRequestPending),
	).Scan(
		&stored.ID,
		&stored.PluginID,
		&stored.RequesterUserID,
		&stored.SourceKind,
		&stored.ManifestURL,
		&stored.BundleSHA256,
		&pluginJSON,
		&stored.Status,
		&stored.ReviewNotes,
		&stored.ReviewedBy,
		&stored.ReviewedAt,
		&stored.CreatedAt,
		&stored.UpdatedAt,
	)
	if err != nil {
		return PluginVerificationRequest{}, fmt.Errorf("insert verification request: %w", err)
	}
	if err := json.Unmarshal(pluginJSON, &stored.Plugin); err != nil {
		return PluginVerificationRequest{}, fmt.Errorf("unmarshal plugin metadata: %w", err)
	}
	return stored, nil
}

func (r *Repository) ListVerificationRequests(ctx context.Context) ([]PluginVerificationRequest, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, plugin_id, requester_user_id, source_kind, manifest_url, bundle_sha256, plugin_metadata, status, review_notes, reviewed_by, reviewed_at, created_at, updated_at
		 FROM plugin_verification_requests
		 ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("query verification requests: %w", err)
	}
	defer rows.Close()

	var out []PluginVerificationRequest
	for rows.Next() {
		var req PluginVerificationRequest
		var pluginJSON []byte
		if err := rows.Scan(
			&req.ID,
			&req.PluginID,
			&req.RequesterUserID,
			&req.SourceKind,
			&req.ManifestURL,
			&req.BundleSHA256,
			&pluginJSON,
			&req.Status,
			&req.ReviewNotes,
			&req.ReviewedBy,
			&req.ReviewedAt,
			&req.CreatedAt,
			&req.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan verification request: %w", err)
		}
		if err := json.Unmarshal(pluginJSON, &req.Plugin); err != nil {
			return nil, fmt.Errorf("unmarshal verification plugin metadata: %w", err)
		}
		out = append(out, req)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate verification requests: %w", err)
	}
	return out, nil
}

func (r *Repository) ReviewVerificationRequest(ctx context.Context, requestID, reviewerUserID string, approved bool, notes string) error {
	status := VerificationRequestRejected
	if approved {
		status = VerificationRequestApproved
	}
	_, err := r.db.Exec(ctx,
		`UPDATE plugin_verification_requests
		 SET status = $2,
		     review_notes = NULLIF($3, ''),
		     reviewed_by = $4,
		     reviewed_at = NOW(),
		     updated_at = NOW()
		 WHERE id = $1`,
		requestID, string(status), notes, reviewerUserID,
	)
	if err != nil {
		return fmt.Errorf("review verification request: %w", err)
	}
	return nil
}

func (r *Repository) ListVerifiedPlugins(ctx context.Context) ([]PluginMetadata, error) {
	rows, err := r.db.Query(ctx,
		`SELECT plugin_metadata
		 FROM plugin_verification_requests
		 WHERE status = $1
		 ORDER BY updated_at DESC`,
		string(VerificationRequestApproved),
	)
	if err != nil {
		return nil, fmt.Errorf("query verified plugins: %w", err)
	}
	defer rows.Close()

	var out []PluginMetadata
	for rows.Next() {
		var pluginJSON []byte
		if err := rows.Scan(&pluginJSON); err != nil {
			return nil, fmt.Errorf("scan verified plugin: %w", err)
		}
		var plugin PluginMetadata
		if err := json.Unmarshal(pluginJSON, &plugin); err != nil {
			return nil, fmt.Errorf("unmarshal verified plugin: %w", err)
		}
		out = append(out, plugin)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate verified plugins: %w", err)
	}
	return out, nil
}
