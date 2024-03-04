const testDatax = {
  'test_single_job': {
    "job_usage": [
      {
        "username": "user1",
        "token": "token1234",
        "status": 0,
        "process_status": 0,
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-04T17:10:15.000000+00:00",
        "finished": "2021-08-04T17:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:15.000000+00:00",
            "finish": "2021-08-05T17:10:15.000000+00:00"
          }
        ],
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "instance_1",
          "multiplier": 3,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      }
    ],
    "hypercube_job_usage": [
    ],
    "pool_usage": [
    ]
  },
  'pool_many_cases': {
    "job_usage": [{
      "username": "job_not_on_pool_before_timeframe",
      "token": "string",
      "status": 0,
      "process_status": 0,
      "namespace": "string",
      "model": "string",
      "submitted": "2021-08-04T17:10:15.000000+00:00",
      "finished": "2021-08-04T17:10:15.000000+00:00",
      "times": [
        {
          "start": "2021-07-03T17:10:15.000000+00:00",
          "finish": "2021-07-03T17:10:35.000000+00:00"
        }
      ],
      "labels": {
        "cpu_request": 0,
        "memory_request": 0,
        "workspace_request": 0,
        "tolerations": [
          {
            "key": "string",
            "value": "string"
          }
        ],
        "node_selectors": [
          {
            "key": "string",
            "value": "string"
          }
        ],
        "resource_warning": "none",
        "instance": "job_0",
        "multiplier": 3,
        "additionalProp1": "string",
        "additionalProp2": "string",
        "additionalProp3": "string"
      }
    },
    {
      "username": "job_not_on_pool",
      "token": "string",
      "status": 0,
      "process_status": 0,
      "namespace": "string",
      "model": "string",
      "submitted": "2021-08-04T17:10:15.000000+00:00",
      "finished": "2021-08-04T17:10:15.000000+00:00",
      "times": [
        {
          "start": "2021-08-03T17:10:05.000000+00:00",
          "finish": "2021-08-03T17:10:35.000000+00:00"
        }
      ],
      "labels": {
        "cpu_request": 0,
        "memory_request": 0,
        "workspace_request": 0,
        "tolerations": [
          {
            "key": "string",
            "value": "string"
          }
        ],
        "node_selectors": [
          {
            "key": "string",
            "value": "string"
          }
        ],
        "resource_warning": "none",
        "instance": "job_1",
        "multiplier": 3,
        "additionalProp1": "string",
        "additionalProp2": "string",
        "additionalProp3": "string"
      }
    },
    {
      "username": "pool_job",
      "token": "string",
      "status": 0,
      "process_status": 0,
      "namespace": "string",
      "model": "string",
      "submitted": "2021-08-04T17:10:15.000000+00:00",
      "finished": "2021-08-04T17:10:15.000000+00:00",
      "times": [
        {
          "start": "2021-08-05T17:09:55.000000+00:00",
          "finish": "2021-08-05T17:10:35.000000+00:00"
        }
      ],
      "labels": {
        "cpu_request": 0,
        "memory_request": 0,
        "workspace_request": 0,
        "tolerations": [
          {
            "key": "string",
            "value": "string"
          }
        ],
        "node_selectors": [
          {
            "key": "string",
            "value": "string"
          }
        ],
        "resource_warning": "none",
        "instance": "pool_1",
        "multiplier": 3,
        "additionalProp1": "string",
        "additionalProp2": "string",
        "additionalProp3": "string"
      }
    }
    ],
    "hypercube_job_usage": [
    ],
    "pool_usage": [
      {
        "label": "pool_1",
        "owner": "string",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-03T17:10:15.000000+00:00",
        "deleted_at": "2021-08-06T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": null,
            "worker_id": "worker1",
            "multiplier_idle": 2
          },
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": null,
            "worker_id": "worker1",
            "multiplier_idle": 2
          },
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          },
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker2",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_2",
        "owner": "test_workers_in_before_after_over_timeframe",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-03T17:10:15.000000+00:00",
        "deleted_at": "2021-08-06T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-07-04T17:10:05.000000+00:00",
            "finish": "2021-07-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          },
          {
            "start": "2021-08-03T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker2",
            "multiplier_idle": 2
          },
          {
            "start": "2021-08-05T17:10:05.000000+00:00",
            "finish": "2021-08-05T17:10:45.000000+00:00",
            "worker_id": "worker3",
            "multiplier_idle": 2
          },
          {
            "start": "2021-08-02T17:10:15.000000+00:00",
            "finish": "2021-08-06T17:10:15.000000+00:00",
            "worker_id": "worker4",
            "multiplier_idle": 2
          },
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker5",
            "multiplier_idle": 2
          }
        ]
      }
    ]
  },
  'test_pool_with_same_label': {
    "job_usage": [
      {
        "username": "pool_job",
        "token": "string",
        "status": 0,
        "process_status": 0,
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-04T17:09:55.000000+00:00",
        "finished": "2021-08-04T17:10:35.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:09:55.000000+00:00",
            "finish": "2021-08-04T17:10:35.000000+00:00"
          }
        ],
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "pool_1",
          "multiplier": 3,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      },
      {
        "username": "pool_job_2",
        "token": "string",
        "status": 0,
        "process_status": 0,
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-05T17:10:15.000000+00:00",
        "finished": "2021-08-06T17:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-05T17:10:15.000000+00:00",
            "finish": "2021-08-06T17:10:15.000000+00:00"
          }
        ],
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "pool_1",
          "multiplier": 3,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      }
    ],
    "hypercube_job_usage": [
    ],
    "pool_usage": [
      {
        "label": "pool_1",
        "owner": "string",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:09:55.000000+00:00",
        "deleted_at": "2021-08-04T17:10:55.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:09:55.000000+00:00",
            "finish": null,
            "worker_id": "worker1",
            "multiplier_idle": 2
          },
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": null,
            "worker_id": "worker1",
            "multiplier_idle": 2
          },
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:55.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_1",
        "owner": "test_workers_in_before_after_over_timeframe",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-03T17:10:05.000000+00:00",
        "deleted_at": "2021-08-03T17:10:55.000000+00:00",
        "times": [
          {
            "start": "2021-08-03T17:10:05.000000+00:00",
            "finish": "2021-08-03T17:10:55.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      }
    ]
  },
  'test_hypercube_with_pool_and_job': {
    "job_usage": [
      {
        "username": "job_not_on_pool",
        "token": "token1",
        "status": 0,
        "process_status": 0,
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-04T17:10:15.000000+00:00",
        "finished": "2021-08-04T17:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-03T17:10:15.000000+00:00",
            "finish": "2021-08-03T17:10:35.000000+00:00"
          }
        ],
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "job_1",
          "multiplier": 3,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      },
      {
        "username": "job_not_on_pool",
        "token": "token2",
        "status": 0,
        "process_status": 0,
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-04T17:10:15.000000+00:00",
        "finished": "2021-08-04T17:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-03T17:10:15.000000+00:00",
            "finish": "2021-08-03T17:10:35.000000+00:00"
          }
        ],
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "job_1",
          "multiplier": 3,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      }
    ],
    "hypercube_job_usage": [
      {
        "username": "hc_1",
        "token": "token3",
        "job_count": 0,
        "completed": 0,
        "jobs": [
          {
            "job_number": 0,
            "status": 0,
            "process_status": 0,
            "times": [
              {
                "start": "2021-08-04T17:10:15.000000+00:00",
                "finish": null
              },
              {
                "start": "2021-08-04T17:10:15.000000+00:00",
                "finish": "2021-08-04T17:10:35.000000+00:00"
              }
            ]
          }
        ],
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-04T17:10:15.000000+00:00",
        "finished": "2021-08-04T17:10:15.000000+00:00",
        "status": 0,
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "hypercube_instance1",
          "multiplier": 1,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      },
      {
        "username": "hc_2",
        "token": "token4",
        "job_count": 0,
        "completed": 0,
        "jobs": [
          {
            "job_number": 0,
            "status": 0,
            "process_status": 0,
            "times": [
              {
                "start": "2021-08-04T17:10:15.000000+00:00",
                "finish": "2021-08-04T17:10:35.000000+00:00"
              }
            ]
          }
        ],
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-04T17:10:15.000000+00:00",
        "finished": "2021-08-04T17:10:15.000000+00:00",
        "status": 0,
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "pool_1",
          "multiplier": 2,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      }
    ],
    "pool_usage": [
      {
        "label": "pool_1",
        "owner": "pool_user",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      }
    ]
  },
  'test_too_many_pool_labels': {
    "job_usage": [
    ],
    "hypercube_job_usage": [
    ],
    "pool_usage": [
      {
        "label": "pool_1",
        "owner": "pool_user",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_2",
        "owner": "pool_user",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_3",
        "owner": "pool_user",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_4",
        "owner": "pool_user",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_5",
        "owner": "pool_user",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_6",
        "owner": "pool_user",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_7",
        "owner": "pool_user",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_8",
        "owner": "pool_user",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_9",
        "owner": "pool_user",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_10",
        "owner": "pool_user",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_11",
        "owner": "pool_user",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 2,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          }
        ]
      }
    ]
  },
  'test_calc_quota_cases': {
    "job_usage": [
      {
        "username": "job_failed_but_finished",
        "token": "token1234",
        "status": 0,
        "process_status": 0,
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-04T17:10:15.000000+00:00",
        "finished": "2021-08-04T17:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:15.000000+00:00",
            "finish": null
          }
        ],
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "instance_1",
          "multiplier": 3,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      },
      {
        "username": "job_still_running",
        "token": "token1234",
        "status": 0,
        "process_status": 0,
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-04T17:10:15.000000+00:00",
        "finished": null,
        "times": [
          {
            "start": "2021-08-04T17:10:15.000000+00:00",
            "finish": null
          }
        ],
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "instance_1",
          "multiplier": 3,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      },
      {
        "username": "job_started_earlier",
        "token": "token1234",
        "status": 0,
        "process_status": 0,
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-04T17:10:15.000000+00:00",
        "finished": "2021-08-04T17:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-07-04T17:10:15.000000+00:00",
            "finish": "2021-08-04T17:10:15.000000+00:00"
          }
        ],
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "instance_1",
          "multiplier": 3,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      },
      {
        "username": "job_still_runnig",
        "token": "token1234",
        "status": 0,
        "process_status": 0,
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-04T17:10:15.000000+00:00",
        "finished": "2021-08-04T17:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:15.000000+00:00",
            "finish": "2021-09-04T17:10:15.000000+00:00"
          }
        ],
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "instance_1",
          "multiplier": 3,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      },
      {
        "username": "job_over_timeframe",
        "token": "token1234",
        "status": 0,
        "process_status": 0,
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-04T17:10:15.000000+00:00",
        "finished": "2021-08-04T17:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-07-04T17:10:15.000000+00:00",
            "finish": "2021-09-04T17:10:15.000000+00:00"
          }
        ],
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "instance_1",
          "multiplier": 3,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      },
      {
        "username": "job_outside_timeframe",
        "token": "token1234",
        "status": 0,
        "process_status": 0,
        "namespace": "string",
        "model": "string",
        "submitted": "2021-08-04T17:10:15.000000+00:00",
        "finished": "2021-08-04T17:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-07-04T17:10:15.000000+00:00",
            "finish": "2021-07-04T17:10:15.000000+00:00"
          }
        ],
        "labels": {
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "resource_warning": "none",
          "instance": "instance_1",
          "multiplier": 3,
          "additionalProp1": "string",
          "additionalProp2": "string",
          "additionalProp3": "string"
        }
      }
    ],
    "hypercube_job_usage": [
    ],
    "pool_usage": [
      {
        "label": "pool_1",
        "owner": "multiple_worker",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 1,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": null,
            "worker_id": "worker1",
            "multiplier_idle": 2
          },
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": null,
            "worker_id": "worker2",
            "multiplier_idle": 2
          },
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker1",
            "multiplier_idle": 2
          },
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:45.000000+00:00",
            "worker_id": "worker2",
            "multiplier_idle": 2
          }
        ]
      },
      {
        "label": "pool_2",
        "owner": "both_worker_crashed_but_pool_finished",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 1,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-04T19:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": null,
            "worker_id": "worker1",
            "multiplier_idle": 1
          },
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": null,
            "worker_id": "worker1",
            "multiplier_idle": 1
          }
        ]
      },
      {
        "label": "pool_3",
        "owner": "pool_still_running",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 1,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": null,
        "times": [
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": null,
            "worker_id": "worker1",
            "multiplier_idle": 1
          }
        ]
      },
      {
        "label": "pool_3",
        "owner": "worker_in_and_out_of_timeframe",
        "instance": {
          "label": "pool_instance",
          "cpu_request": 0,
          "memory_request": 0,
          "workspace_request": 0,
          "node_selectors": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "tolerations": [
            {
              "key": "string",
              "value": "string"
            }
          ],
          "multiplier": 0,
          "multiplier_idle": 1,
          "is_pool": true,
          "pool_instance": "string",
          "pool_size": 0,
          "pool_size_active": 0,
          "pool_size_busy": 0,
          "pool_cancelling": true
        },
        "created_at": "2021-08-04T17:10:15.000000+00:00",
        "deleted_at": "2021-08-05T17:10:15.000000+00:00",
        "times": [
          {
            "start": "2021-07-04T17:10:05.000000+00:00",
            "finish": "2021-08-04T17:10:15.000000+00:00",
            "worker_id": "start_early",
            "multiplier_idle": 1
          },
          {
            "start": "2021-08-04T17:10:05.000000+00:00",
            "finish": "2021-09-04T17:10:15.000000+00:00",
            "worker_id": "finish_late",
            "multiplier_idle": 1
          },
          {
            "start": "2021-07-04T17:10:05.000000+00:00",
            "finish": "2021-09-04T17:10:15.000000+00:00",
            "worker_id": "over_timeframe",
            "multiplier_idle": 1
          }
        ]
      }
    ]
  }
}
//const testData = testDatax.test_hypercube_with_pool_and_job

export { testDatax }
